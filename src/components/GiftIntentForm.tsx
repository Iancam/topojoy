import React, { useState } from "react";

export const GIFT_INTENT_KEY = "topojoy_gift_intent";

export type GiftIntent = {
  who: string;
  why: string;
  empathy: string;
  title: string;
};

export const getStoredGiftIntent = (): GiftIntent | null => {
  try {
    const raw = localStorage.getItem(GIFT_INTENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearStoredGiftIntent = () =>
  localStorage.removeItem(GIFT_INTENT_KEY);

export const steps = [
  {
    key: "who" as const,
    prompt: "Who are you making this map for?",
    placeholder:
      "A name, or a relationship — your sister, an old friend, a mentor…",
    multiline: false,
  },
  {
    key: "why" as const,
    prompt: "Why this place? Why them?",
    placeholder:
      "What does this place mean to them? What are you hoping they'll feel?",
    multiline: true,
  },
  {
    key: "empathy" as const,
    prompt:
      "The gift will mean more to you if you put yourself in their shoes for a moment. How would it feel to receive this?",
    placeholder: "What would it mean to them to have this on their wall?",
    noAnswer: true,
    multiline: false,
  },
  {
    key: "title" as const,
    prompt: "Last thing — what would you like to call this map?",
    placeholder: 'e.g. "Redwood Creek, 2013" or "The PCT trip"…',
    multiline: false,
  },
];

export function GiftIntentForm({
  onComplete,
  onSkip,
  ctaLabel = "Start drawing the map →",
}: {
  onComplete: (intent: GiftIntent) => void;
  onSkip?: () => void;
  ctaLabel?: string;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<GiftIntent>({
    who: "",
    why: "",
    empathy: "",
    title: "",
  });

  const current = steps[step];
  const currentAnswer = answers[current.key];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (!current.noAnswer && !currentAnswer.trim()) return;
    if (isLast) {
      localStorage.setItem(GIFT_INTENT_KEY, JSON.stringify(answers));
      onComplete(answers);
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !current.multiline) {
      e.preventDefault();
      handleNext();
    }
    if (e.key === "Enter" && e.metaKey && current.multiline) {
      e.preventDefault();
      handleNext();
    }
  };

  const renderInput = () => {
    if (current.noAnswer) {
      return null;
    }
    if (current.multiline) {
      return (
        <textarea
          autoFocus
          rows={3}
          value={currentAnswer}
          onChange={(e) =>
            setAnswers((a) => ({ ...a, [current.key]: e.target.value }))
          }
          onKeyDown={handleKeyDown}
          placeholder={current.placeholder}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-teal-400 resize-none transition-colors"
        />
      );
    }
    return (
      <input
        autoFocus
        type="text"
        value={currentAnswer}
        onChange={(e) =>
          setAnswers((a) => ({ ...a, [current.key]: e.target.value }))
        }
        onKeyDown={handleKeyDown}
        placeholder={current.placeholder}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-teal-400 transition-colors"
      />
    );
  };

  return (
    <div className="w-full max-w-lg mx-auto text-left bg-black/60 backdrop-blur-md rounded-2xl px-6 py-6 shadow-2xl">
      <div className="mb-6">
        <div className="flex gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-teal-400" : "bg-white/20"
              }`}
            />
          ))}
        </div>

        <p className="text-base md:text-lg font-light text-white/90 leading-7 mb-4">
          {current.prompt}
        </p>

        {renderInput()}
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleNext}
          disabled={current.noAnswer ? false : !currentAnswer.trim()}
          className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-30 text-[#071e25] font-semibold rounded transition-colors duration-200 text-sm"
        >
          {isLast ? ctaLabel : "Continue →"}
        </button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            skip for now
          </button>
        )}
      </div>
    </div>
  );
}
