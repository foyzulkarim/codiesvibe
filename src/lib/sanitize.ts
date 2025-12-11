/**
 * Text Sanitization Utilities
 *
 * Provides secure text sanitization using DOMPurify to prevent XSS attacks.
 * All user-generated content and dynamic HTML should use these utilities.
 */

import DOMPurify from 'dompurify';

/**
 * Configure DOMPurify with safe defaults
 */
const createDOMPurifyInstance = () => {
  // Configure DOMPurify to only allow safe HTML tags
  const config: DOMPurify.Config = {
    ALLOWED_TAGS: ['mark', 'b', 'i', 'em', 'strong', 'span'],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  };

  return {
    sanitize: (dirty: string, customConfig?: DOMPurify.Config) => {
      return DOMPurify.sanitize(dirty, { ...config, ...customConfig });
    },
  };
};

const purify = createDOMPurifyInstance();

/**
 * Escape special regex characters in a string
 * Used to safely create RegExp from user input
 */
const escapeRegExp = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Safely highlight search terms in text
 * Sanitizes both the input text and search term to prevent XSS
 *
 * @param text - The text to highlight in
 * @param term - The search term to highlight
 * @returns Sanitized HTML string with highlighted terms
 *
 * @example
 * ```ts
 * const highlighted = highlightText('Hello world', 'world');
 * // Returns: 'Hello <mark class="bg-yellow-200">world</mark>'
 * ```
 */
export const highlightText = (text: string, term?: string): string => {
  if (!text) return '';
  if (!term || term.length < 2) {
    // Sanitize even without highlighting
    return purify.sanitize(text, { ALLOWED_TAGS: [] });
  }

  // Sanitize the input text first (strip all HTML)
  const sanitizedText = purify.sanitize(text, { ALLOWED_TAGS: [] });

  // Sanitize the search term (strip all HTML)
  const sanitizedTerm = purify.sanitize(term, { ALLOWED_TAGS: [] });

  // Create safe regex pattern with validation
  const escapedTerm = escapeRegExp(sanitizedTerm);
  if (!escapedTerm || escapedTerm.length > 1000) {
    // Fallback to sanitized text if term is invalid
    return purify.sanitize(sanitizedText);
  }
  // eslint-disable-next-line security/detect-non-literal-regexp -- escapedTerm is sanitized via escapeRegExp which escapes all special regex characters
  const regex = new RegExp(`(${escapedTerm})`, 'gi');

  // Replace with highlighted version
  const highlighted = sanitizedText.replace(
    regex,
    '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
  );

  // Final sanitization pass to ensure only <mark> tags remain
  return purify.sanitize(highlighted);
};

/**
 * Sanitize HTML content to prevent XSS
 * Removes all dangerous HTML but keeps safe formatting tags
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 *
 * @example
 * ```ts
 * const safe = sanitizeHtml('<script>alert("xss")</script><b>Hello</b>');
 * // Returns: '<b>Hello</b>'
 * ```
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  return purify.sanitize(html);
};

/**
 * Strip all HTML tags from a string
 * Useful for displaying plain text from potentially HTML-containing sources
 *
 * @param html - The HTML string to strip
 * @returns Plain text without any HTML tags
 *
 * @example
 * ```ts
 * const plain = stripHtml('<b>Hello</b> <script>alert("xss")</script>');
 * // Returns: 'Hello '
 * ```
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';
  return purify.sanitize(html, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize user input for safe display
 * More restrictive than sanitizeHtml - only allows basic text formatting
 *
 * @param text - The text to sanitize
 * @returns Sanitized text
 */
export const sanitizeUserInput = (text: string): string => {
  if (!text) return '';
  return purify.sanitize(text, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: [],
  });
};
