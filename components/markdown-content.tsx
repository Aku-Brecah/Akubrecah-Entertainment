'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Configure marked options for optimal GitHub-flavored output
marked.setOptions({
  gfm: true,
  breaks: true,
});

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const [cleanHtml, setCleanHtml] = useState<string>('');

  useEffect(() => {
    if (!content) return;

    // Scrub vercel.app domains and direct github links from public markdown
    const sanitized = content
      .replace(/https?:\/\/[a-zA-Z0-9_-]*kra[a-zA-Z0-9_-]*\.vercel\.app/gi, 'https://kra.akubrecah.com')
      .replace(/https?:\/\/[a-zA-Z0-9_-]+\.vercel\.app/gi, 'https://akubrecah.com')
      .replace(/https?:\/\/github\.com\/Akubrecah\/[a-zA-Z0-9_.-]+/gi, '#');

    // Pre-process any GitHub specific callouts e.g. > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING]
    const enhanced = sanitized
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

    // Convert to HTML
    const rawHtml = marked.parse(enhanced) as string;

    // Dynamically load DOMPurify on the client to avoid jsdom SSR bundling issues
    import('dompurify')
      .then((DOMPurifyModule) => {
        const DOMPurify = DOMPurifyModule.default;
        setCleanHtml(DOMPurify.sanitize(rawHtml));
      })
      .catch(() => {
        setCleanHtml(rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''));
      });
  }, [content]);

  // Safe SSR fallback (strip dangerous tags while awaiting hydration)
  const initialHtml = useMemo(() => {
    if (!content) return '';
    const raw = marked.parse(content) as string;
    return raw.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }, [content]);

  if (!content) return null;

  return (
    <div
      className={`markdown-reader ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHtml || initialHtml }}
    />
  );
}

