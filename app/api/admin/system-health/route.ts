import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from "next/server";
import os from "os";
import net from "net";
import tls from "tls";
import url from "url";
import https from "https";
import { verifyAdminCaller } from "@/lib/admin-auth";
import { validateProxyUrl } from "@/lib/security/ssrf";

export const maxDuration = 30;

// Helper to create proxy agent (same as in KRA captcha/retrieve routes)
function createProxyAgent(rawProxyUrl: string): any {
  const proxyUrl = validateProxyUrl(rawProxyUrl);
  if (!proxyUrl) return undefined;
  
  return new https.Agent({
    createConnection: (opts: any, callback: any) => {
      const proxyParsed = url.parse(proxyUrl);
      const proxyHost = proxyParsed.hostname || '';
      const proxyPort = parseInt(proxyParsed.port || '8080', 10);

      const socket = net.connect(proxyPort, proxyHost, () => {
        let connectReq = `CONNECT ${opts.host}:${opts.port} HTTP/1.1\r\n` +
                         `Host: ${opts.host}:${opts.port}\r\n`;
        if (proxyParsed.auth) {
          const base64Auth = Buffer.from(proxyParsed.auth).toString('base64');
          connectReq += `Proxy-Authorization: Basic ${base64Auth}\r\n`;
        }
        connectReq += '\r\n';
        socket.write(connectReq);
      });

      let buffer = '';
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        if (buffer.includes('\r\n\r\n')) {
          socket.off('data', onData);
          socket.off('error', onError);
          if (buffer.startsWith('HTTP/1.1 200') || buffer.startsWith('HTTP/1.0 200')) {
            const secureSocket = tls.connect({
              socket,
              servername: opts.host,
              rejectUnauthorized: process.env.KRA_ALLOW_INSECURE_TLS !== 'true', // MITM guard: strict TLS unless explicitly opted out
            });
            callback(null, secureSocket);
          } else {
            socket.destroy();
            callback(new Error(`Proxy CONNECT failed: ${buffer.split('\r\n')[0]}`));
          }
        }
      };

      const onError = (err: Error) => {
        socket.destroy();
        callback(err);
      };

      socket.on('data', onData);
      socket.on('error', onError);
    }
  } as any);
}

// 1. Database connection latency check using net socket connect
async function pingDatabase(host: string, port = 5432): Promise<number> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2500);

    socket.on("connect", () => {
      const latency = Date.now() - start;
      socket.destroy();
      resolve(latency);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(-1);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(-1);
    });

    socket.connect(port, host);
  });
}

// 2. Clerk Auth API latency and count check
async function pingClerk(secretKey: string): Promise<{ status: string; latency: number; count: number }> {
  const start = Date.now();
  try {
    const res = await fetch("https://api.clerk.com/v1/users/count", {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      const count = typeof data === "number" ? data : (data.total_count || 0);
      return { status: "Operational", latency, count };
    }
    return { status: "Degraded", latency, count: 0 };
  } catch (err) {
    return { status: "Outage", latency: Date.now() - start, count: 0 };
  }
}

// 3. KRA Portal check via proxy (uses https.request so proxy agent is honoured)
async function pingKRA(proxyUrl?: string): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  return new Promise((resolve) => {
    try {
      const agent = proxyUrl ? createProxyAgent(proxyUrl) : undefined;
      const req = https.request(
        {
          hostname: 'itax.kra.go.ke',
          port: 443,
          path: '/KRA-Portal/pinChecker.htm?actionCode=loadPage&viewType=static',
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          timeout: 4000,
          rejectUnauthorized: process.env.KRA_ALLOW_INSECURE_TLS !== 'true',
          agent,
        } as any,
        (res) => {
          const latency = Date.now() - start;
          res.resume();
          const code = res.statusCode || 0;
          if ((code >= 200 && code < 400) || code === 403) {
            resolve({ status: 'Operational', latency });
          } else {
            resolve({ status: 'Degraded', latency });
          }
        }
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'Outage', latency: Date.now() - start });
      });
      req.on('error', () => {
        resolve({ status: 'Outage', latency: Date.now() - start });
      });
      req.end();
    } catch {
      resolve({ status: 'Outage', latency: Date.now() - start });
    }
  });
}

// 4. Evolution WhatsApp Gateway check
async function pingEvolutionWhatsApp(): Promise<{ status: string; latency: number; state: string }> {
  const start = Date.now();
  const baseUrl = (process.env.EVOLUTION_API_URL || 'https://wa.akubrecah.com').replace(/\/$/, '');
  const instanceName = encodeURIComponent(process.env.EVOLUTION_INSTANCE_NAME || 'akubrecah-kra');
  const apiKey = process.env.EVOLUTION_API_KEY || '';
  if (!apiKey) {
    return { status: 'Unconfigured', latency: 0, state: 'missing_api_key' };
  }
  try {
    const res = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      headers: {
        apikey: apiKey,
      },
      signal: AbortSignal.timeout(3500),
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      const state = data?.instance?.state || 'unknown';
      const status = state === 'open' ? 'Operational' : state === 'connecting' ? 'Awaiting QR Scan' : 'Degraded';
      return { status, latency, state };
    }
    return { status: 'Outage', latency: Date.now() - start, state: 'not_found' };
  } catch {
    return { status: 'Outage', latency: Date.now() - start, state: 'error' };
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized: Admin access required." }, { status: 403 });
    }

    const proxyUrl = process.env.KRA_PROXY_URL || process.env.PROXY_URL || "";
    const clerkSecret = process.env.CLERK_SECRET_KEY || "";
    const dbUrl = process.env.DATABASE_URL || "";

    // Parse Database Host from DATABASE_URL (no hardcoded external host)
    let dbHost = "";
    let dbPort = 5432;
    try {
      if (dbUrl) {
        const tempUrl = dbUrl.replace(/^postgres(ql)?:\/\//, "http://");
        const parsed = new URL(tempUrl);
        dbHost = parsed.hostname || "";
        dbPort = parsed.port ? parseInt(parsed.port, 10) : dbPort;
      }
    } catch {}

    // Perform concurrent checks
    const [dbLatency, clerkRes, kraRes, waRes] = await Promise.all([
      dbHost ? pingDatabase(dbHost, dbPort) : Promise.resolve(-1),
      pingClerk(clerkSecret),
      pingKRA(proxyUrl),
      pingEvolutionWhatsApp(),
    ]);

    // Calculate OS metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = Math.round((usedMem / totalMem) * 100);

    const cpuLoad = os.loadavg(); // Returns 1, 5, and 15 min load averages
    const uptime = process.uptime(); // Process uptime in seconds

    // Construct response
    const metrics = [
      { label: "Server Uptime", value: Math.floor(uptime), unit: "seconds" },
      { label: "Active Users (Clerk)", value: clerkRes.count.toLocaleString(), unit: "accounts" },
      { label: "CPU Load (1m)", value: cpuLoad[0].toFixed(2), unit: "" },
      { label: "Memory Usage", value: memoryUsagePercent.toString(), unit: "%" },
    ];

    const services = [
      { 
        name: "Neon Database", 
        status: dbLatency !== -1 ? "Operational" : "Outage", 
        latency: dbLatency !== -1 ? `${dbLatency}ms` : "N/A" 
      },
      { 
        name: "Authentication Service (Clerk)", 
        status: clerkRes.status, 
        latency: `${clerkRes.latency}ms` 
      },
      { 
        name: "Taxpayer Filing API (KRA Portal)", 
        status: kraRes.status, 
        latency: kraRes.latency > 0 ? `${kraRes.latency}ms` : "N/A" 
      },
      {
        name: "Evolution WhatsApp Bot Gateway",
        status: waRes.status,
        latency: `${waRes.latency}ms (${waRes.state})`,
      },
    ];

    return NextResponse.json({
      success: true,
      metrics,
      services,
      systemTime: new Date().toISOString(),
    });
  } catch (error: any) {
    log.error("[API System Health GET Error]:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
