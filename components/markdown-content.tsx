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
 * Synchronous, SSR-safe HTML sanitizer that runs on both server and client
 * before DOMPurify hydrates, preventing SSR/initial-paint XSS via event
 * handlers, dangerous tags, or javascript:/vbscript:/data: URIs.
 */
export function sanitizeMarkdownHtml(html: string): string {
  if (!html) return '';
  return html
    // Remove dangerous block elements and their contents
    .replace(/<(script|style|iframe|object|embed|svg|math|form|textarea|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Remove self-closing or unclosed dangerous tags
    .replace(/<\/?(script|style|iframe|object|embed|svg|math|form|input|button|select|textarea|meta|link|base)\b[^>]*\/?>/gi, '')
    // Strip inline event handlers (onclick=, onerror=, onload=, etc.)
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Strip dangerous URI schemes in href/src/xlink:href/action/formaction
    .replace(
      /\b(href|src|xlink:href|action|formaction)\s*=\s*("|\')\s*(?:javascript|vbscript|data):[^"']*\2/gi,
      '$1="#"'
    )
    .replace(
      /\b(href|src|xlink:href|action|formaction)\s*=\s*(?:javascript|vbscript|data):[^\s>]+/gi,
      '$1="#"'
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

