/**
 * API Versioning Support
 *
 * This module provides utilities for managing API versions, allowing
 * gradual migration to new API versions and A/B testing capabilities.
 *
 * Features:
 * - Multiple API version support
 * - Per-endpoint version override
 * - Version negotiation
 * - Backward compatibility helpers
 */

/**
 * Supported API versions
 */
export enum ApiVersion {
  V1 = 'v1',
  V2 = 'v2',
}

/**
 * API version configuration
 */
export interface ApiVersionConfig {
  /**
   * Default API version to use
   */
  default: ApiVersion;

  /**
   * Preferred version (for version negotiation)
   */
  preferred?: ApiVersion;

  /**
   * Per-endpoint version overrides
   * Example: { '/tools': 'v2', '/auth': 'v1' }
   */
  overrides?: Record<string, ApiVersion>;

  /**
   * Enable version header (X-API-Version)
   */
  sendVersionHeader?: boolean;

  /**
   * Accept-Version header value for content negotiation
   */
  acceptVersion?: ApiVersion;
}

/**
 * Default API version configuration
 */
export const defaultVersionConfig: ApiVersionConfig = {
  default: ApiVersion.V1,
  preferred: ApiVersion.V1,
  sendVersionHeader: true,
  overrides: {},
};

/**
 * Current API version configuration
 * Can be overridden via environment variable or programmatically
 */
export const apiVersionConfig: ApiVersionConfig = {
  default: (import.meta.env.VITE_API_VERSION as ApiVersion) || ApiVersion.V1,
  preferred: (import.meta.env.VITE_API_PREFERRED_VERSION as ApiVersion) || ApiVersion.V1,
  sendVersionHeader: import.meta.env.VITE_API_SEND_VERSION_HEADER !== 'false',
  overrides: parseVersionOverrides(import.meta.env.VITE_API_VERSION_OVERRIDES),
};

/**
 * Parse version overrides from environment variable
 * Format: "endpoint1:v1,endpoint2:v2"
 */
function parseVersionOverrides(overridesStr?: string): Record<string, ApiVersion> {
  if (!overridesStr) return {};

  const overrides: Record<string, ApiVersion> = {};
  const pairs = overridesStr.split(',');

  for (const pair of pairs) {
    const [endpoint, version] = pair.split(':');
    if (endpoint && version) {
      overrides[endpoint.trim()] = version.trim() as ApiVersion;
    }
  }

  return overrides;
}

/**
 * Get the API version for a specific endpoint
 *
 * @param endpoint - The endpoint path (e.g., '/tools', '/auth/login')
 * @param config - Optional version configuration
 * @returns The API version to use
 *
 * @example
 * ```ts
 * const version = getApiVersion('/tools');
 * // Returns 'v1' or 'v2' based on configuration
 * ```
 */
export function getApiVersion(
  endpoint: string,
  config: ApiVersionConfig = apiVersionConfig
): ApiVersion {
  // Check for endpoint-specific override
  if (config.overrides) {
    for (const [path, version] of Object.entries(config.overrides)) {
      if (endpoint.startsWith(path)) {
        return version;
      }
    }
  }

  // Use preferred version if set, otherwise default
  return config.preferred || config.default;
}

/**
 * Build versioned URL path
 *
 * @param endpoint - The endpoint path (e.g., '/tools')
 * @param version - Optional version (uses default if not specified)
 * @returns Versioned URL path (e.g., '/v1/tools')
 *
 * @example
 * ```ts
 * const url = buildVersionedUrl('/tools');
 * // Returns '/v1/tools'
 *
 * const url2 = buildVersionedUrl('/tools', ApiVersion.V2);
 * // Returns '/v2/tools'
 * ```
 */
export function buildVersionedUrl(
  endpoint: string,
  version?: ApiVersion
): string {
  const apiVersion = version || getApiVersion(endpoint);

  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  // Build versioned path
  return `/${apiVersion}/${cleanEndpoint}`;
}

/**
 * Get version headers for API requests
 *
 * @param endpoint - The endpoint path
 * @param config - Optional version configuration
 * @returns Headers object with version information
 *
 * @example
 * ```ts
 * const headers = getVersionHeaders('/tools');
 * // Returns { 'X-API-Version': 'v1', 'Accept-Version': 'v1' }
 * ```
 */
export function getVersionHeaders(
  endpoint: string,
  config: ApiVersionConfig = apiVersionConfig
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (config.sendVersionHeader) {
    const version = getApiVersion(endpoint, config);
    headers['X-API-Version'] = version;

    if (config.acceptVersion) {
      headers['Accept-Version'] = config.acceptVersion;
    }
  }

  return headers;
}

/**
 * Check if an API version is supported
 *
 * @param version - The version to check
 * @returns True if version is supported
 */
export function isVersionSupported(version: string): boolean {
  return Object.values(ApiVersion).includes(version as ApiVersion);
}

/**
 * Parse API version from response headers
 *
 * @param headers - Response headers
 * @returns The API version used by the server
 *
 * @example
 * ```ts
 * const serverVersion = parseResponseVersion(response.headers);
 * if (serverVersion !== clientVersion) {
 *   console.warn('API version mismatch');
 * }
 * ```
 */
export function parseResponseVersion(
  headers: Record<string, string | undefined>
): ApiVersion | null {
  const versionHeader = headers['x-api-version'] || headers['X-API-Version'];

  if (versionHeader && isVersionSupported(versionHeader)) {
    return versionHeader as ApiVersion;
  }

  return null;
}

/**
 * Version migration helpers
 */
export const versionMigration = {
  /**
   * Check if response is from V2 API
   */
  isV2Response: (version: ApiVersion | null): boolean => {
    return version === ApiVersion.V2;
  },

  /**
   * Migrate V1 response to V2 format
   * Implement actual migration logic as needed
   */
  migrateV1ToV2: <T>(data: unknown): T => {
    // TODO: Implement migration logic based on actual API changes
    return data as T;
  },

  /**
   * Migrate V2 response to V1 format (for backward compatibility)
   * Implement actual migration logic as needed
   */
  migrateV2ToV1: <T>(data: unknown): T => {
    // TODO: Implement migration logic based on actual API changes
    return data as T;
  },
};

/**
 * Feature flags for version-specific features
 */
export const versionFeatures = {
  /**
   * Check if a feature is available in the current API version
   */
  hasFeature: (feature: string, version: ApiVersion = apiVersionConfig.default): boolean => {
    const featureMatrix: Record<string, ApiVersion[]> = {
      // Define feature availability per version
      'ai-search': [ApiVersion.V1, ApiVersion.V2],
      'advanced-filtering': [ApiVersion.V2],
      'batch-operations': [ApiVersion.V2],
      'websocket-support': [ApiVersion.V2],
    };

    const supportedVersions = featureMatrix[feature] || [];
    return supportedVersions.includes(version);
  },

  /**
   * Get minimum version required for a feature
   */
  getMinVersion: (feature: string): ApiVersion | null => {
    const featureMatrix: Record<string, ApiVersion> = {
      'ai-search': ApiVersion.V1,
      'advanced-filtering': ApiVersion.V2,
      'batch-operations': ApiVersion.V2,
      'websocket-support': ApiVersion.V2,
    };

    return featureMatrix[feature] || null;
  },
};

/**
 * Update API version configuration at runtime
 *
 * @param updates - Partial configuration updates
 *
 * @example
 * ```ts
 * // Switch all requests to V2
 * updateVersionConfig({ default: ApiVersion.V2 });
 *
 * // Override specific endpoint
 * updateVersionConfig({
 *   overrides: { '/tools': ApiVersion.V2 }
 * });
 * ```
 */
export function updateVersionConfig(updates: Partial<ApiVersionConfig>): void {
  Object.assign(apiVersionConfig, updates);
}

/**
 * Reset API version configuration to defaults
 */
export function resetVersionConfig(): void {
  Object.assign(apiVersionConfig, defaultVersionConfig);
}

/**
 * Environment variable configuration for API versioning
 *
 * Add these to your .env file:
 *
 * ```env
 * # Default API version (v1 or v2)
 * VITE_API_VERSION=v1
 *
 * # Preferred version for content negotiation
 * VITE_API_PREFERRED_VERSION=v1
 *
 * # Send version header with requests
 * VITE_API_SEND_VERSION_HEADER=true
 *
 * # Per-endpoint version overrides
 * # Format: "endpoint1:v1,endpoint2:v2"
 * VITE_API_VERSION_OVERRIDES=/tools:v2,/auth:v1
 * ```
 */
