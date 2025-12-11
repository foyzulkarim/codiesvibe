/**
 * Debug Utility
 *
 * Conditional debug logging based on environment configuration
 */

import { CONFIG } from '#config/env.config';

/**
 * Log debug information if DEBUG environment variable is set
 * @param message - Debug message
 * @param data - Data to log (will be stringified)
 */
export function debugLog(message: string, data?: unknown): void {
  if (CONFIG.debug.DEBUG || CONFIG.env.IS_DEVELOPMENT) {
    if (data !== undefined) {
      console.log(`[DEBUG] ${message}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

/**
 * Log debug error information
 */
export function debugError(message: string, error: Error | unknown): void {
  if (CONFIG.debug.DEBUG || CONFIG.env.IS_DEVELOPMENT) {
    console.error(`[DEBUG ERROR] ${message}`, error);
  }
}
