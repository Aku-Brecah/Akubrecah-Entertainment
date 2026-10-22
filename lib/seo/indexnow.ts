import { log } from '@/lib/monitoring/logger';
/**
 * IndexNow Protocol Client
 * Instantly alerts Bing, Yandex, Seznam, and Naver whenever URLs are created or updated.
 * Protocol spec: https://www.indexnow.org/documentation
 */

const DEFAULT_INDEXNOW_KEY = 'c95843a0d5c040d6832dbff09ce6a213';
const DEFAULT_HOST = 'akubrecah.com';

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export interface IndexNowResult {
  success: boolean;
  status?: number;
  message?: string;
  submittedUrls: string[];
}

/**
 * Dispatches an IndexNow submission to notify search engines of URL changes.
 * @param urls Array of absolute or relative URLs to submit.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const host = process.env.NEXT_PUBLIC_APP_HOST || DEFAULT_HOST;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${host}`;
  const key = process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
  const keyLocation = `${baseUrl}/${key}.txt`;

  // Normalize all URLs to fully-qualified HTTPS URLs
  const normalizedUrls = urls.map((u) => {
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    const cleanPath = u.startsWith('/') ? u : `/${u}`;
    return `${baseUrl}${cleanPath}`;
  });

  if (normalizedUrls.length === 0) {
    return {
      success: false,
      message: 'No URLs provided for IndexNow submission.',
      submittedUrls: [],
    };
  }

  const payload: IndexNowPayload = {
    host,
    key,
    keyLocation,
    urlList: normalizedUrls,
  };

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    // HTTP 200 or 202 denotes successful receipt by the IndexNow gateway
    const isSuccess = response.status === 200 || response.status === 202;

    return {
      success: isSuccess,
      status: response.status,
      message: isSuccess
        ? `Successfully submitted ${normalizedUrls.length} URL(s) to IndexNow.`
        : `IndexNow returned HTTP status ${response.status}: ${response.statusText}`,
      submittedUrls: normalizedUrls,
    };
  } catch (error) {
    log.error('[IndexNow] Submission failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown network failure during IndexNow submission.',
      submittedUrls: normalizedUrls,
    };
  }
}
