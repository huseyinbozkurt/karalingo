import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { apiKeys, setApiKeys, setSetupComplete } = useAppStore();

  const [keys, setKeys] = useState({
    acrcloud_host: apiKeys.acrcloud_host || "",
    acrcloud_key: apiKeys.acrcloud_key || "",
    acrcloud_secret: apiKeys.acrcloud_secret || "",
    genius_key: apiKeys.genius_key || "",
    libretranslate_url: apiKeys.libretranslate_url || "https://libretranslate.com",
  });

  useEffect(() => {
    setKeys({
      acrcloud_host: apiKeys.acrcloud_host || "",
      acrcloud_key: apiKeys.acrcloud_key || "",
      acrcloud_secret: apiKeys.acrcloud_secret || "",
      genius_key: apiKeys.genius_key || "",
      libretranslate_url: apiKeys.libretranslate_url || "https://libretranslate.com",
    });
  }, [apiKeys]);

  const handleSave = useCallback(() => {
    setApiKeys(keys);
    setSetupComplete(true);

    // Persist to localStorage as fallback (Tauri store used in production)
    try {
      localStorage.setItem("karalingo_keys", JSON.stringify(keys));
    } catch {
      // ignore
    }

    onClose();
  }, [keys, setApiKeys, setSetupComplete, onClose]);

  const updateKey = (field: string, value: string) => {
    setKeys((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* ACRCloud */}
          <section>
            <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">
              ACRCloud (Song Recognition)
            </h3>
            <div className="space-y-3">
              <InputField
                label="Host"
                placeholder="identify-eu-west-1.acrcloud.com"
                value={keys.acrcloud_host}
                onChange={(v) => updateKey("acrcloud_host", v)}
              />
              <InputField
                label="Access Key"
                placeholder="Your ACRCloud access key"
                value={keys.acrcloud_key}
                onChange={(v) => updateKey("acrcloud_key", v)}
              />
              <InputField
                label="Access Secret"
                placeholder="Your ACRCloud access secret"
                value={keys.acrcloud_secret}
                onChange={(v) => updateKey("acrcloud_secret", v)}
                type="password"
              />
            </div>
          </section>

          {/* Lyrics sources */}
          <section>
            <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">
              Lyrics
            </h3>
            <div className="bg-surface-light rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-400 leading-relaxed">
                <span className="text-emerald-400 font-medium">lrclib.net</span> is used first (free, no key needed).
                Genius is the fallback for plain lyrics. Whisper extracts lyrics from audio as a last resort.
              </p>
            </div>
            <InputField
              label="Genius API Key (optional fallback)"
              placeholder="Your Genius API access token"
              value={keys.genius_key}
              onChange={(v) => updateKey("genius_key", v)}
            />
          </section>

          {/* LibreTranslate */}
          <section>
            <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">
              LibreTranslate (Translation)
            </h3>
            <InputField
              label="API URL"
              placeholder="https://libretranslate.com"
              value={keys.libretranslate_url}
              onChange={(v) => updateKey("libretranslate_url", v)}
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Use a self-hosted instance or the public endpoint
            </p>
          </section>

          {/* Python dependencies info */}
          <section className="bg-surface-light rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Local Processing
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Demucs (vocal removal) and Whisper (speech-to-text) run locally on your machine.
              They will be auto-installed via pip when first used. Requires Python 3.8+.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-light text-sm font-medium text-white transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2
                   text-sm text-gray-200 placeholder-gray-600
                   focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30
                   transition-colors"
      />
    </div>
  );
}
