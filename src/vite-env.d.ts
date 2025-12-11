/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Authentication
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;

  // API Configuration
  readonly VITE_SEARCH_API_URL?: string;

  // Timeouts (optional with defaults)
  readonly VITE_API_TIMEOUT?: string;
  readonly VITE_SEARCH_TIMEOUT?: string;

  // Search Configuration (optional)
  readonly VITE_SEARCH_DEBOUNCE_DELAY?: string;
  readonly VITE_SEARCH_MIN_LENGTH?: string;
  readonly VITE_SEARCH_DEFAULT_LIMIT?: string;

  // React Query Configuration (optional)
  readonly VITE_QUERY_STALE_TIME?: string;
  readonly VITE_QUERY_CACHE_TIME?: string;
  readonly VITE_QUERY_RETRY_COUNT?: string;

  // Feature Flags (optional)
  readonly VITE_ENABLE_DEVTOOLS?: string;
  readonly VITE_ENABLE_REQUEST_LOGGING?: string;
  readonly VITE_DEBUG?: string;

  // Application Metadata (optional)
  readonly VITE_APP_NAME?: string;
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_APP_VERSION?: string;

  // Vite built-in environment variables
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
