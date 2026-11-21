'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Decodes HTML numeric/hex/named entities and strips control/whitespace characters
 * so obfuscated schemes like `jav&#x09;ascript:` or `&#106;avascript:` are caught.
 */
function normalizeUriForSchemeCheck(rawUri: string): string {
  return rawUri
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&#(\d+);?/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&colon;/gi, ':')
    .replace(/&tab;/gi, '')
    .replace(/&newline;/gi, '')
    .replace(/[\u0000-\u0020\s]+/g, '')
    .toLowerCase();
}

function isUnsafeUriAttributeValue(rawValue: string): boolean {
  const normalized = normalizeUriForSchemeCheck(rawValue);
  if (!normalized) return false;
  if (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('file:') ||
    normalized.startsWith('blob:')
  ) {
    return true;
  }
  return false;
}

/**
 * Synchronous, SSR-safe HTML sanitizer that runs on both server and client
 * before DOMPurify hydrates, preventing SSR/initial-paint XSS via event
 * handlers, dangerous tags, srcdoc, CSS expressions, or entity-obfuscated
 * javascript:/vbscript:/data: URIs.
 */
export function sanitizeMarkdownHtml(html: string): string {
  if (!html) return '';
  return html
    // Remove dangerous block elements and their contents
    .replace(/<(script|style|iframe|object|embed|svg|math|form|textarea|template|noscript|applet|frame|frameset)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Remove self-closing or unclosed dangerous tags
    .replace(/<\/?(script|style|iframe|object|embed|svg|math|form|input|button|select|textarea|meta|link|base|applet|frame|frameset)\b[^>]*\/?>/gi, '')
    // Strip inline event handlers (onclick=, onerror=, onload=, etc.)
    .replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Strip iframe/embed srcdoc and unsafe inline style expressions
    .replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+style\s*=\s*(?:"[^"]*(?:expression|javascript|vbscript|behavior|-moz-binding)[^"]*"|'[^']*(?:expression|javascript|vbscript|behavior|-moz-binding)[^']*')/gi, '')
    // Inspect and sanitize quoted URI attributes (including HTML entity & control-char obfuscation)
    .replace(
      /\b(href|src|xlink:href|action|formaction|poster|background)\s*=\s*("([^"]*)"|'([^']*)')/gi,
      (fullMatch, attrName, _quoted, doubleVal, singleVal) => {
        const val = doubleVal !== undefined ? doubleVal : singleVal || '';
        if (isUnsafeUriAttributeValue(val)) {
          return `${attrName}="#"`;
        }
        return fullMatch;
      }
    )
    // Inspect and sanitize unquoted URI attributes
    .replace(
      /\b(href|src|xlink:href|action|formaction|poster|background)\s*=\s*([^\s"'>]+)/gi,
      (fullMatch, attrName, rawVal) => {
        if (isUnsafeUriAttributeValue(rawVal)) {
          return `${attrName}="#"`;
        }
        return fullMatch;
      }
    );
}

function preprocessMarkdown(content: string): string {
  const sanitized = content
    .replace(/https?:\/\/[a-zA-Z0-9_-]*kra[a-zA-Z0-9_-]*\.vercel\.app/gi, 'https://kra.akubrecah.com')
    .replace(/https?:\/\/[a-zA-Z0-9_-]+\.vercel\.app/gi, 'https://akubrecah.com')
    .replace(/https?:\/\/github\.com\/Akubrecah\/[a-zA-Z0-9_.-]+/gi, '#');

  return sanitized
    .replace(
      /> \[!NOTE\]\s*\n((?:> .*\n?)*)/gi,
      '<div class="github-alert alert-note"><div class="alert-title">Note</div>$1</div>'
    )
    .replace(
      /> \[!TIP\]\s*\n((?:> .*\n?)*)/gi,
      '<div class="github-alert alert-tip"><div class="alert-title">Tip</div>$1</div>'
    )
    .replace(
      /> \[!IMPORTANT\]\s*\n((?:> .*\n?)*)/gi,
      '<div class="github-alert alert-important"><div class="alert-title">Important</div>$1</div>'
    )
    .replace(
      /> \[!WARNING\]\s*\n((?:> .*\n?)*)/gi,
      '<div class="github-alert alert-warning"><div class="alert-title">Warning</div>$1</div>'
    );
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const [cleanHtml, setCleanHtml] = useState<string>('');

  const initialHtml = useMemo(() => {
    if (!content) return '';
    const enhanced = preprocessMarkdown(content);
    const raw = marked.parse(enhanced) as string;
    return sanitizeMarkdownHtml(raw);
  }, [content]);

  useEffect(() => {
    if (!content) return;
    let cancelled = false;
    const enhanced = preprocessMarkdown(content);
    const rawHtml = marked.parse(enhanced) as string;

    import('dompurify')
      .then((DOMPurifyModule) => {
        if (cancelled) return;
        const DOMPurify = DOMPurifyModule.default;
        setCleanHtml(DOMPurify.sanitize(rawHtml));
      })
      .catch(() => {
        if (cancelled) return;
        setCleanHtml(sanitizeMarkdownHtml(rawHtml));
      });

    return () => {
      cancelled = true;
    };
  }, [content]);

  if (!content) return null;

  return (
    <div
      className={`markdown-reader ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHtml || initialHtml }}
    />
  );
}

