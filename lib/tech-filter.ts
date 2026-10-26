/**
 * Utility to sanitize technology tags and URLs displayed on the public website.
 * Hides raw internal libraries/frameworks (Next.js, TypeScript, Prisma, PostgreSQL,
 * M-Pesa STK, Paystack, PDF-Lib, WhatsApp Baileys, etc.) and enforces official live URLs.
 */

const BLOCKED_PUBLIC_TECH_PATTERNS = [
  /next\.?js/i,
  /typescript/i,
  /prisma/i,
  /postgres/i,
  /neon/i,
  /m-?pesa\s*stk/i,
  /daraja/i,
  /paystack/i,
  /pdf-?lib/i,
  /baileys/i,
  /whatsapp\s*baileys/i,
  /evolution/i,
  /tailwind/i,
  /node\.?js/i,
  /python/i,
  /ffmpeg/i,
  /whisper/i,
  /ctranslate/i,
  /gradio/i,
  /react\s*native/i,
  /expo/i,
  /wasm|webassembly/i,
  /tesseract/i,
  /git$|^git\b/i,
  /docker/i,
  /turbopack/i,
]

/**
 * Filter out internal framework and library names from public-facing tags.
 * Replaces them with solution capabilities if the filtered list becomes too sparse.
 */
export function filterPublicTechnologies(technologies?: (string | null | undefined)[]): string[] {
  if (!Array.isArray(technologies) || technologies.length === 0) {
    return ['GovTech Architecture', 'Cloud Automation', 'Enterprise System']
  }

  const clean = technologies
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .filter((t) => !BLOCKED_PUBLIC_TECH_PATTERNS.some((pattern) => pattern.test(t.trim())))

  if (clean.length === 0) {
    return ['Enterprise Solution', 'Production System', 'GovTech Gateway']
  }

  return clean
}

/**
 * Enforces production live URLs, ensuring KRA compliance points to kra.akubrecah.com
 * and strips any legacy vercel.app domains.
 */
export function cleanPublicLiveUrl(slug?: string | null, rawUrl?: string | null): string | null {
  if (!rawUrl && !slug) return null

  const s = (slug || '').toLowerCase()
  const u = (rawUrl || '').toLowerCase()

  // KRA statutory portal must strictly point to official kra.akubrecah.com domain
  if (s.includes('kra') || u.includes('kra')) {
    return 'https://kra.akubrecah.com'
  }

  // Strip vercel.app URLs from public display if custom domain isn't assigned
  if (rawUrl && rawUrl.includes('.vercel.app')) {
    return null
  }

  return rawUrl || null
}
