'use client';

interface OnboardingNavigationProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  showSkip: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onSkipAll: () => void;
  labels: {
    back: string;
    next: string;
    finish: string;
    skip: string;
    skipAll: string;
    saving: string;
  };
}

export function OnboardingNavigation({
  currentStep,
  totalSteps,
  isSubmitting,
  showSkip,
  onBack,
  onNext,
  onSkip,
  onSkipAll,
  labels,
}: OnboardingNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="space-y-4 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirstStep || isSubmitting}
          className="rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.back}
        </button>

        <div className="flex items-center gap-2">
          {showSkip ? (
            <button
              type="button"
              onClick={onSkip}
              disabled={isSubmitting}
              className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labels.skip}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLastStep ? (isSubmitting ? labels.saving : labels.finish) : labels.next}
          </button>
        </div>
      </div>

      {!isLastStep ? (
        <button
          type="button"
          onClick={onSkipAll}
          disabled={isSubmitting}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.skipAll}
        </button>
      ) : null}
    </div>
  );
}
