import { useState, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import { getEnvDefaults } from "../utils/envDefaults";

const STEPS = [
  {
    title: "Welcome to KaraLingo",
    description: "Your cross-platform karaoke app with real-time translation. Let's get you set up in a few steps.",
    icon: (
      <div className="text-5xl mb-4">🎤</div>
    ),
  },
  {
    title: "Song Recognition",
    description: "To recognize songs from your microphone, you'll need an ACRCloud account (free tier available).",
    fields: ["acrcloud_host", "acrcloud_key", "acrcloud_secret"],
  },
  {
    title: "Lyrics",
    description: "Lyrics are fetched from lrclib.net (free, no key). Optionally add a Genius API key as a fallback for more coverage.",
    fields: ["genius_key"],
  },
  {
    title: "Translation",
    description: "LibreTranslate handles lyrics translation. You can use the public instance or self-host one.",
    fields: ["libretranslate_url"],
  },
];

const FIELD_CONFIG: Record<string, { label: string; placeholder: string; type?: string }> = {
  acrcloud_host: { label: "ACRCloud Host", placeholder: "identify-eu-west-1.acrcloud.com" },
  acrcloud_key: { label: "Access Key", placeholder: "Your ACRCloud access key" },
  acrcloud_secret: { label: "Access Secret", placeholder: "Your ACRCloud secret", type: "password" },
  genius_key: { label: "Genius API Key (optional)", placeholder: "Your Genius access token" },
  libretranslate_url: { label: "LibreTranslate URL", placeholder: "https://libretranslate.com" },
};

export function SetupWizard() {
  const { setApiKeys, setSetupComplete, setView } = useAppStore();
  const [step, setStep] = useState(0);
  const envDefaults = getEnvDefaults();
  const [keys, setKeys] = useState({
    acrcloud_host: envDefaults.acrcloud_host || "",
    acrcloud_key: envDefaults.acrcloud_key || "",
    acrcloud_secret: envDefaults.acrcloud_secret || "",
    genius_key: envDefaults.genius_key || "",
    libretranslate_url: envDefaults.libretranslate_url || "https://libretranslate.com",
  });

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      setApiKeys(keys);
      setSetupComplete(true);
      try {
        localStorage.setItem("karalingo_keys", JSON.stringify(keys));
      } catch {
        // ignore
      }
      setView("main");
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, keys, setApiKeys, setSetupComplete, setView, step]);

  const handleSkip = useCallback(() => {
    setSetupComplete(true);
    setView("main");
  }, [setSetupComplete, setView]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-gray-700"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl border border-gray-800 p-8">
          {currentStep.icon && (
            <div className="text-center">{currentStep.icon}</div>
          )}

          <h2 className="text-xl font-bold text-white text-center mb-2">
            {currentStep.title}
          </h2>
          <p className="text-sm text-gray-400 text-center mb-6 leading-relaxed">
            {currentStep.description}
          </p>

          {/* Fields */}
          {currentStep.fields && (
            <div className="space-y-3 mb-6">
              {currentStep.fields.map((field) => {
                const config = FIELD_CONFIG[field];
                return (
                  <div key={field}>
                    <label className="block text-xs text-gray-400 mb-1">
                      {config.label}
                    </label>
                    <input
                      type={config.type || "text"}
                      placeholder={config.placeholder}
                      value={keys[field as keyof typeof keys]}
                      onChange={(e) =>
                        setKeys((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5
                                 text-sm text-gray-200 placeholder-gray-600
                                 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm text-gray-400
                           hover:text-white border border-gray-700 hover:border-gray-600 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-light
                         text-sm font-medium text-white transition-colors"
            >
              {isLast ? "Get Started" : "Next"}
            </button>
          </div>

          {step === 0 && (
            <button
              onClick={handleSkip}
              className="w-full mt-3 text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Skip setup (configure later in settings)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
