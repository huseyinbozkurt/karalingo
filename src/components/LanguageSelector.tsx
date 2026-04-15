import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store/useAppStore";
import { LANGUAGES } from "../utils/languages";

export function LanguageSelector() {
  const {
    targetLanguage,
    originalLanguage,
    setTargetLanguage,
    setOriginalLanguage,
    lyrics,
    apiKeys,
    setProcessing,
    updateTranslations,
  } = useAppStore();

  const handleTranslate = useCallback(async () => {
    if (lyrics.length === 0) return;

    const libreUrl = apiKeys.libretranslate_url || "https://libretranslate.com";
    const texts = lyrics.map((l) => l.text);

    setProcessing("translating", "Translating lyrics...");

    try {
      // Auto-detect language if needed
      let srcLang = originalLanguage;
      if (srcLang === "auto") {
        const sampleText = texts.slice(0, 5).join(" ");
        srcLang = await invoke<string>("detect_language", {
          text: sampleText,
          apiUrl: libreUrl,
        });
        setOriginalLanguage(srcLang);
      }

      if (srcLang === targetLanguage) {
        setProcessing("ready", "Source and target language are the same");
        return;
      }

      const translations = await invoke<string[]>("translate_text", {
        texts,
        sourceLang: srcLang,
        targetLang: targetLanguage,
        apiUrl: libreUrl,
      });

      updateTranslations(translations);
      setProcessing("ready", "Translation complete!");
    } catch (err) {
      setProcessing("error", `Translation failed: ${err}`);
    }
  }, [
    lyrics,
    originalLanguage,
    targetLanguage,
    apiKeys,
    setProcessing,
    setOriginalLanguage,
    updateTranslations,
  ]);

  return (
    <div className="flex items-center gap-2">
      {/* Source language */}
      <select
        value={originalLanguage}
        onChange={(e) => setOriginalLanguage(e.target.value)}
        className="bg-surface-light border border-gray-700 rounded-lg px-2 py-1.5
                   text-sm text-gray-300 focus:border-primary focus:outline-none"
      >
        <option value="auto">Auto-detect</option>
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>

      <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>

      {/* Target language */}
      <select
        value={targetLanguage}
        onChange={(e) => setTargetLanguage(e.target.value)}
        className="bg-surface-light border border-gray-700 rounded-lg px-2 py-1.5
                   text-sm text-gray-300 focus:border-primary focus:outline-none"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>

      {/* Translate button */}
      <button
        onClick={handleTranslate}
        disabled={lyrics.length === 0}
        className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-light
                   text-sm font-medium text-gray-900 transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Translate
      </button>
    </div>
  );
}
