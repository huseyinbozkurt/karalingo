import { useAppStore } from "../store/useAppStore";

const STEP_LABELS: Record<string, string> = {
  recognizing: "Recognizing Song",
  fetching_lyrics: "Fetching Lyrics",
  separating_vocals: "Separating Vocals",
  translating: "Translating",
};

export function ProcessingOverlay() {
  const { processingStep, processingMessage, setProcessing } = useAppStore();

  if (
    processingStep === "idle" ||
    processingStep === "ready" ||
    processingStep === "error"
  ) {
    return null;
  }

  const label = STEP_LABELS[processingStep] || "Processing";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
      <div className="bg-surface rounded-2xl border border-gray-800 p-8 text-center max-w-sm">
        {/* Animated spinner */}
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-surface-lighter rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-1">{label}</h3>
        {processingMessage && (
          <p className="text-sm text-gray-400">{processingMessage}</p>
        )}

        <button
          onClick={() => setProcessing("idle")}
          className="mt-4 text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
