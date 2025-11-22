import React from "react";
import { cn } from "../lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";
export type MultiStepFormStep = {
  title: string;
  content: React.ReactNode;
};

export type MultiStepFormProps = {
  steps: MultiStepFormStep[];
  initialStep?: number;
  className?: string;
  onSubmit?: () => void;
  leftAction?: React.ReactNode;
  nextLabel?: string;
  prevLabel?: string;
  submitLabel?: string;
};

export const MultiStepForm: React.FC<MultiStepFormProps> = ({
  steps,
  initialStep = 0,
  className,
  onSubmit,
  leftAction,
  nextLabel = "Next",
  prevLabel = "Previous",
  submitLabel = "Submit",
}) => {
  const [current, setCurrent] = React.useState(initialStep);
  const total = steps.length;
  const isFirst = current === 0;
  const isLast = current === total - 1;
  const percent = total > 1 ? Math.round(((current + 1) / total) * 100) : 100;

  const goPrev = () => setCurrent((c) => Math.max(0, c - 1));
  const goNext = () => {
    if (isLast) {
      onSubmit?.();
    } else {
      setCurrent((c) => Math.min(total - 1, c + 1));
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">
            Step {current + 1} of {total}
          </div>
          <div className="text-xs text-gray-500">{percent}%</div>
        </div>
        {/* Progress bar */}
        <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        {/* Step indicators */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar space-y-4">
          {steps.map((s, idx) => {
            const reached = idx <= current;
            const active = idx === current;
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-2 shrink-0",
                  idx < total - 1 && "pr-2"
                )}
              >
                <button
                  type="button"
                  onClick={() => setCurrent(idx)}
                  className={cn(
                    "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border",
                    reached
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300",
                    active && "ring-2 ring-blue-300"
                  )}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Go to step ${idx + 1}: ${s.title}`}
                >
                  {idx + 1}
                </button>
                <span
                  className={cn(
                    "text-xs",
                    reached ? "text-gray-900" : "text-gray-500"
                  )}
                >
                  {s.title}
                </span>
                {idx < total - 1 && (
                  <div className="hidden sm:block w-8 h-[1px] bg-gray-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current step content */}
      <div className="min-h-[200px]">{steps[current]?.content}</div>
      {/* Spacer  */}
      <div className="h-20"></div>
      {/* Footer actions */}
      <div className="sticky bottom-10 left-0 mt-4 bg-white border-t p-3 flex justify-between sm:justify-end gap-3">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">{leftAction}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={isFirst}
              className={cn(
                "px-4 py-2 rounded-md border text-sm font-medium transition-colors inline-flex items-center justify-center gap-1",
                isFirst
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
              aria-label={prevLabel}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{prevLabel}</span>
            </button>
            <button
              type="button"
              onClick={goNext}
              className={cn(
                "px-4 py-2 rounded-md text-white text-sm font-medium transition-colors inline-flex items-center justify-center gap-1",
                isLast
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
              aria-label={isLast ? submitLabel : nextLabel}
            >
              {isLast ? (
                submitLabel
              ) : (
                <div>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{nextLabel}</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
