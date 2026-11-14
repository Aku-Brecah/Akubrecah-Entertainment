import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import net from 'net';
import tls from 'tls';
import url from 'url';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createSystemLog } from '@/lib/prisma';

export const maxDuration = 30;

function createProxyAgent(proxyUrl: string): any {
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
              rejectUnauthorized: process.env.KRA_ALLOW_INSECURE_TLS === 'true',
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

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  let userEmail = "Anonymous";
  if (clerkId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(clerkId);
      userEmail = user.primaryEmailAddress?.emailAddress || clerkId;
    } catch { }
  }
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

  try {
    const proxyUrl = process.env.KRA_PROXY_URL || process.env.PROXY_URL || "";

    // 1. Initialize authentic KRA session directly from KRA iTax portal
    const cookies = await initKraSession(proxyUrl);
    if (!cookies || Object.keys(cookies).length === 0) {
      throw new Error('No session cookies returned by KRA portal.');
    }
    const cookieString = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');

    // 2. Fetch authentic CAPTCHA image directly from KRA
    const randNum = Math.floor(Math.random() * 10000);
    const captchaBuffer = await fetchCaptchaImage(cookieString, randNum, proxyUrl);

    if (!captchaBuffer || captchaBuffer.length === 0) {
      throw new Error('Empty CAPTCHA image returned by KRA.');
    }

    const sessionToken = Buffer.from(cookieString).toString('base64');
    const captchaImage = `data:image/png;base64,${captchaBuffer.toString('base64')}`;

    void createSystemLog({
      level: 'info',
      service: 'KRA-Captcha',
      message: 'Official KRA Captcha challenge loaded successfully from itax.kra.go.ke',
      actor: userEmail,
      ip
    });

    return NextResponse.json(
      {
        success: true,
        captchaImage,
        sessionToken,
      },
      process.env.NODE_ENV !== 'production'
        ? {
          headers: {
            'Clear-Site-Data': '"cache"',
            'Cache-Control': 'no-store',
          },
        }
        : undefined
    );
  } catch (err: any) {
    log.error('[captcha] Official KRA Captcha load error:', err.message);
    void createSystemLog({
      level: 'error',
      service: 'KRA-Captcha',
      message: `Failed to retrieve official CAPTCHA from KRA portal: ${err.message}`,
      actor: userEmail,
      ip,
      details: { error: err.message }
    });

    return NextResponse.json(
      {
        success: false,
        error: `Unable to load official CAPTCHA from KRA: ${err.message}. KRA iTax servers may be experiencing maintenance or connection resets.`,
        upstreamUnavailable: true,
      },
      { status: 502 }
    );
  }
}

function initKraSession(proxyUrl: string): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const agent = createProxyAgent(proxyUrl);
    const options = {
      hostname: 'itax.kra.go.ke',
      port: 443,
      path: '/KRA-Portal/pinChecker.htm?actionCode=loadPage&viewType=static',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      timeout: 10000,
      rejectUnauthorized: process.env.KRA_ALLOW_INSECURE_TLS === 'true',
      agent
    } as any;

    const req = https.request(options, (res) => {
      const rawCookies = res.headers['set-cookie'] || [];
      const cookieMap: Record<string, string> = {};
      rawCookies.forEach((cookie: string) => {
        const [nameValue] = cookie.split(';');
        const eqIdx = nameValue.indexOf('=');
        if (eqIdx > 0) {
          const name = nameValue.substring(0, eqIdx).trim();
          const value = nameValue.substring(eqIdx + 1).trim();
          if (name && value) cookieMap[name] = value;
        }
      });
      resolve(cookieMap);
    });

    req.on('timeout', () => {
      req.destroy(new Error('KRA session initialization timed out (10s)'));
    });
    req.on('error', reject);
    req.end();
  });
}

function fetchCaptchaImage(cookieString: string, randNum: number, proxyUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const agent = createProxyAgent(proxyUrl);
    
    // Primary path: captcahGenerate.htm (used on pinChecker.htm)
    const options = {
      hostname: 'itax.kra.go.ke',
      port: 443,
      path: `/KRA-Portal/captcahGenerate.htm?rand=${randNum}`,
      method: 'GET',
      headers: {
        'Cookie': cookieString,
        'Referer': 'https://itax.kra.go.ke/KRA-Portal/pinChecker.htm?actionCode=loadPage&viewType=static',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      timeout: 10000,
      rejectUnauthorized: process.env.KRA_ALLOW_INSECURE_TLS === 'true',
      agent
    } as any;

    const req = https.get(options, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        // Secondary fallback path: GenerateCaptchaServlet.do
        const fallbackOptions = {
          ...options,
          path: `/KRA-Portal/GenerateCaptchaServlet.do?sourcePage=LOGIN&rand=${randNum}`
        };
        const fallbackReq = https.get(fallbackOptions, (fbRes) => {
          const chunks: Buffer[] = [];
          fbRes.on('data', (chunk: Buffer) => chunks.push(chunk));
          fbRes.on('end', () => resolve(Buffer.concat(chunks)));
        });
        fallbackReq.on('timeout', () => fallbackReq.destroy(new Error('KRA fallback CAPTCHA request timed out')));
        fallbackReq.on('error', reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('timeout', () => {
      req.destroy(new Error('KRA CAPTCHA fetch timed out (10s)'));
    });
    req.on('error', reject);
  });
}
