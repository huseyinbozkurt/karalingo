import type { ApiKeys } from "../store/types";

/**
 * Read API key defaults from Vite environment variables.
 * These come from .env / .env.local / .env.[mode] files.
 * Values are baked in at build time via `import.meta.env.VITE_*`.
 *
 * Precedence (highest wins):
 *   1. User edits in the Settings UI (persisted to localStorage)
 *   2. .env.local  (gitignored, developer secrets)
 *   3. .env        (gitignored, shared team defaults)
 *   4. .env.public (committed template — typically empty)
 */
export function getEnvDefaults(): ApiKeys {
  return {
    acrcloud_host: import.meta.env.VITE_ACRCLOUD_HOST || undefined,
    acrcloud_key: import.meta.env.VITE_ACRCLOUD_KEY || undefined,
    acrcloud_secret: import.meta.env.VITE_ACRCLOUD_SECRET || undefined,
    genius_key: import.meta.env.VITE_GENIUS_KEY || undefined,
    libretranslate_url: import.meta.env.VITE_LIBRETRANSLATE_URL || undefined,
  };
}

/**
 * Merge two ApiKeys objects: `overrides` values take precedence,
 * but fall back to `defaults` for any missing/empty keys.
 */
export function mergeKeys(defaults: ApiKeys, overrides: ApiKeys): ApiKeys {
  return {
    acrcloud_host: overrides.acrcloud_host || defaults.acrcloud_host,
    acrcloud_key: overrides.acrcloud_key || defaults.acrcloud_key,
    acrcloud_secret: overrides.acrcloud_secret || defaults.acrcloud_secret,
    genius_key: overrides.genius_key || defaults.genius_key,
    libretranslate_url: overrides.libretranslate_url || defaults.libretranslate_url,
  };
}
