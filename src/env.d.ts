/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
  readonly VITE_TAPI_SERVER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 