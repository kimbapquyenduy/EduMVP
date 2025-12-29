'use client'

import DOMPurify from 'dompurify'

/**
 * Sanitizes user-generated content to prevent XSS attacks.
 * Strips all HTML tags while preserving text content.
 */
export function sanitizeUserContent(content: string): string {
  if (typeof window === 'undefined') {
    // Server-side: basic sanitization
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
}

/**
 * Sanitizes HTML content with a safe subset of tags.
 * For use with rich text editor output (Phase 05).
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    return html
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
  })
}
