/// <reference types="vite/client" />

// No environment variables needed for the free-maps branch.
// All map/geocoding/routing services are free with no API keys.
interface ImportMetaEnv {
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
