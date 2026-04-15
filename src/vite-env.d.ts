/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACRCLOUD_HOST: string;
  readonly VITE_ACRCLOUD_KEY: string;
  readonly VITE_ACRCLOUD_SECRET: string;
  readonly VITE_GENIUS_KEY: string;
  readonly VITE_LIBRETRANSLATE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
