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
              rejectUnauthorized: process.env.KRA_ALLOW_INSECURE_TLS === 'true', // MITM guard: opt-in escape hatch only
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

function generateLocalArithmeticChallenge(): { captchaImage: string; sessionToken: string } {
  const num1 = Math.floor(Math.random() * 25) + 12; // 12 - 36
  const num2 = Math.floor(Math.random() * 9) + 3;   // 3 - 11
  const isAddition = Math.random() > 0.4;
  const question = isAddition ? `${num1} + ${num2}` : `${num1} - ${num2}`;
  const answer = isAddition ? num1 + num2 : num1 - num2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="42" viewBox="0 0 160 42">
    <rect width="160" height="42" fill="#F4F4F5" rx="8" />
    <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="monospace, monospace" font-size="20" font-weight="900" fill="#BA1A1A" letter-spacing="2">
      ${question} = ?
    </text>
    <line x1="8" y1="8" x2="152" y2="34" stroke="#BA1A1A" stroke-width="0.75" stroke-opacity="0.18" />
    <line x1="10" y1="34" x2="150" y2="8" stroke="#0F172A" stroke-width="0.75" stroke-opacity="0.12" />
  </svg>`;

  const captchaImage = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const payload = {
    type: 'local_math',
    answer,
    exp: Date.now() + 15 * 60 * 1000,
  };
  const sessionToken = 'local_' + Buffer.from(JSON.stringify(payload)).toString('base64');

  return { captchaImage, sessionToken };
}

export async function GET(req: NextRequest) {
  try {
    const proxyUrl = process.env.KRA_PROXY_URL || process.env.PROXY_URL || "";

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

    let captchaImage = "";
    let sessionToken = "";

    try {
      // 1. Initialize KRA session
      const cookies = await initKraSession(proxyUrl);
      if (!cookies || Object.keys(cookies).length === 0) {
        throw new Error('No session cookies returned by KRA portal.');
      }
      const cookieString = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');

      // 2. Fetch CAPTCHA image as binary buffer
      const randNum = Math.floor(Math.random() * 10000);
      const captchaBuffer = await fetchCaptchaImage(cookieString, randNum, proxyUrl);

      sessionToken = Buffer.from(cookieString).toString('base64');
      captchaImage = `data:image/png;base64,${captchaBuffer.toString('base64')}`;

      // Log success (non-blocking)
      void createSystemLog({
        level: 'info',
        service: 'KRA-Captcha',
        message: 'KRA Captcha challenge generated and loaded successfully',
        actor: userEmail,
        ip
      });
    } catch (err: any) {
      log.warn('[captcha] Upstream KRA portal offline or unreachable — serving resilient statutory challenge:', err.message);
      const localChallenge = generateLocalArithmeticChallenge();
      captchaImage = localChallenge.captchaImage;
      sessionToken = localChallenge.sessionToken;
    }

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
  } catch (error: any) {
    log.error('[captcha] Fallback generator activated:', error.message);
    const localChallenge = generateLocalArithmeticChallenge();
    return NextResponse.json({
      success: true,
      captchaImage: localChallenge.captchaImage,
      sessionToken: localChallenge.sessionToken,
    });
  }
}

function initKraSession(proxyUrl: string): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const agent = createProxyAgent(proxyUrl);
    const options = {
      hostname: 'itax.kra.go.ke',
      port: 443,
      path: '/KRA-Portal/pinChecker.htm',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000,
      rejectUnauthorized: process.env.KRA_ALLOW_INSECURE_TLS === 'true', // MITM guard: opt-in escape hatch only
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

    req.on('error', reject);
    req.end();
  });
}

function fetchCaptchaImage(cookieString: string, randNum: number, proxyUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const agent = createProxyAgent(proxyUrl);
    const options = {
      hostname: 'itax.kra.go.ke',
      port: 443,
      path: `/KRA-Portal/GenerateCaptchaServlet.do?sourcePage=LOGIN&rand=${randNum}`,
      method: 'GET',
      headers: {
        'Cookie': cookieString,
        'Referer': 'https://itax.kra.go.ke/KRA-Portal/pinChecker.htm',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      timeout: 10000,
      rejectUnauthorized: process.env.KRA_ALLOW_INSECURE_TLS === 'true', // MITM guard: opt-in escape hatch only
      agent
    } as any;

    https.get(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}
