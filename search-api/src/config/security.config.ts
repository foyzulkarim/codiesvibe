/**
 * Security Configuration
 *
 * Centralized security settings including malicious pattern detection,
 * security headers, and rate limiting configuration.
 */

import { CONFIG } from './env.config.js';

// Enhanced malicious pattern detection
export const MALICIOUS_PATTERNS = [
  // XSS attempts
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick=, onerror=
  /<iframe/gi,
  /<embed/gi,
  /<object/gi,

  // Code execution attempts
  /eval\s*\(/gi,
  /exec\s*\(/gi,
  /system\s*\(/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
  /Function\s*\(/gi,

  // Command substitution
  /`[\s\S]*`/g, // Backticks
  /\$\([^)]*\)/g, // $(command)

  // Escape sequences
  /\\x[0-9a-fA-F]{2}/g, // Hex escape
  /\\u[0-9a-fA-F]{4}/g, // Unicode escape
  /&#x?[0-9a-fA-F]+;/g, // HTML entities

  // SQL/NoSQL injection patterns
  /\b(DROP|DELETE|TRUNCATE)\s+(TABLE|FROM|DATABASE)/gi,
  /\b(INSERT|UPDATE)\s+(INTO|TABLE|FROM)/gi,
  /UNION\s+SELECT/gi,
  /--\s*$/gm, // SQL comments
  /\/\*[\s\S]*?\*\//g, // Multi-line comments
];

/**
 * Check if query contains malicious patterns
 */
export function containsMaliciousPattern(query: string): boolean {
  return MALICIOUS_PATTERNS.some(pattern => {
    // Reset regex lastIndex to avoid state issues with global flag
    pattern.lastIndex = 0;
    return pattern.test(query);
  });
}

/**
 * Security configuration settings
 */
export const securityConfig = {
  // Enable/disable security headers (Helmet)
  enableSecurityHeaders: CONFIG.features.ENABLE_SECURITY_HEADERS,

  // Enable/disable rate limiting
  enableRateLimiting: CONFIG.features.ENABLE_RATE_LIMITING,

  // Request body size limits
  requestBodyLimit: '10mb',

  // HTTP Parameter Pollution whitelist
  hppWhitelist: ['query', 'limit', 'debug', 'tags', 'categories'],

  // Helmet configuration
  helmetConfig: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for API compatibility
  },
};
