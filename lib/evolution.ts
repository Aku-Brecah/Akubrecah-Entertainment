/**
 * Evolution API Client (Self-Hosted Free WhatsApp Integration)
 * Compatible with atendai/evolution-api:latest
 */

export function getEvolutionApiUrl(): string {
  let envUrl = (process.env.EVOLUTION_API_URL || '').trim();

  // 1. If running inside docker container network where 'evolution' service is specified, preserve internal port 8080
  if (envUrl.includes('evolution:') || envUrl === 'http://evolution:8080') {
    return 'http://evolution:8080';
  }

  // 2. If empty or local, use the public HTTPS gateway (routed to evolution:8080 via Caddy)
  if (
    !envUrl ||
    envUrl.includes('localhost') ||
    envUrl.includes('127.0.0.1') ||
    envUrl.includes('<YOUR_VPS_IP>')
  ) {
    return 'https://wa.akubrecah.com';
  }

  // 3. Only remap :8080 to :8085 if accessing raw VPS host IP from outside docker
  if (envUrl.includes(':8080') && envUrl.includes('169.58.96.131')) {
    envUrl = envUrl.replace(':8080', ':8085');
  }

  // 4. Raw IP does not have TLS certificate, must use http
  if (envUrl.startsWith('https://169.58.96.131')) {
    envUrl = envUrl.replace('https://', 'http://');
  }

  return envUrl;
}

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'akubrecah_secret_whatsapp_key_2026';

export function getEvolutionInstanceName(): string {
  const envVal = (process.env.EVOLUTION_INSTANCE_NAME || 'akubrecah-bot').trim();
  if (!envVal || envVal === 'Akubrecah Entertainment' || envVal === 'akubrecah-kra' || envVal === 'akubrecah-portal') {
    return 'akubrecah-bot';
  }
  return envVal;
}

/**
 * Format phone numbers to international format required by WhatsApp/Evolution API
 * e.g. 0712345678 -> 254712345678
 *      +254712345678 -> 254712345678
 *      254712345678@s.whatsapp.net -> 254712345678
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  const cleaned = phone.replace(/@s\.whatsapp\.net/g, '').replace(/[\s\-\+\(\)]/g, '');
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    return '254' + cleaned;
  }
  if ((cleaned.startsWith('07') || cleaned.startsWith('01')) && cleaned.length === 10) {
    return '254' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Send a plain text or formatted message to a WhatsApp user
 */
export async function sendEvolutionTextMessage(
  phone: string,
  text: string
): Promise<{ success: boolean; error?: string; targetUrl?: string }> {
  const baseUrl = getEvolutionApiUrl();
  const instanceName = encodeURIComponent(getEvolutionInstanceName());
  const url = `${baseUrl.replace(/\/$/, '')}/message/sendText/${instanceName}`;
  try {
    const formattedPhone = sanitizeWhatsAppPhone(phone);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: text,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Evolution API] Failed to send text message:', response.status, errText);
      return { success: false, error: `Evolution API returned ${response.status}: ${errText}`, targetUrl: url };
    }

    return { success: true, targetUrl: url };
  } catch (error: any) {
    const causeMsg = error.cause ? ` (cause: ${error.cause?.code || error.cause?.message || JSON.stringify(error.cause)})` : '';
    console.error('[Evolution API Exception] sendEvolutionTextMessage:', error.message, causeMsg);
    return { success: false, error: `${error.message}${causeMsg}`, targetUrl: url };
  }
}

/**
 * Mark a message as read (blue ticks)
 */
export async function markEvolutionMessageRead({
  remoteJid,
  messageId,
}: {
  remoteJid: string;
  messageId?: string;
}): Promise<void> {
  try {
    const baseUrl = getEvolutionApiUrl();
    const instanceName = encodeURIComponent(getEvolutionInstanceName());
    const url = `${baseUrl.replace(/\/$/, '')}/chat/markMessageAsRead/${instanceName}`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        readMessages: [
          {
            remoteJid,
            fromMe: false,
            id: messageId || '',
          },
        ],
      }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (err: any) {
    console.error('[Evolution API] markEvolutionMessageRead error:', err.message);
  }
}

/**
 * Send a PDF or binary media document to a WhatsApp user
 */
export async function sendEvolutionDocument({
  phone,
  pdfBuffer,
  fileName,
  caption,
}: {
  phone: string;
  pdfBuffer: Buffer;
  fileName: string;
  caption?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = getEvolutionApiUrl();
    const formattedPhone = sanitizeWhatsAppPhone(phone);
    const base64Data = pdfBuffer.toString('base64');
    const instanceName = encodeURIComponent(getEvolutionInstanceName());
    const url = `${baseUrl.replace(/\/$/, '')}/message/sendMedia/${instanceName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formattedPhone,
        mediatype: 'document',
        mimetype: 'application/pdf',
        caption: caption || fileName,
        media: base64Data,
        fileName: fileName,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Evolution API] Failed to send document:', response.status, errText);
      return { success: false, error: `Evolution API returned ${response.status}: ${errText}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Evolution API Exception] sendEvolutionDocument:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send an image buffer (e.g. Verification QR Code PNG) to a WhatsApp user
 */
export async function sendEvolutionImage({
  phone,
  imageBuffer,
  fileName = 'verification_qr.png',
  caption,
}: {
  phone: string;
  imageBuffer: Buffer;
  fileName?: string;
  caption?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = getEvolutionApiUrl();
    const formattedPhone = sanitizeWhatsAppPhone(phone);
    const base64Data = imageBuffer.toString('base64');
    const instanceName = encodeURIComponent(getEvolutionInstanceName());
    const url = `${baseUrl.replace(/\/$/, '')}/message/sendMedia/${instanceName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formattedPhone,
        mediatype: 'image',
        mimetype: 'image/png',
        caption: caption || fileName,
        media: base64Data,
        fileName: fileName,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Evolution API] Failed to send image:', response.status, errText);
      return { success: false, error: `Evolution API returned ${response.status}: ${errText}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Evolution API Exception] sendEvolutionImage:', error.message);
    return { success: false, error: error.message };
  }
}
