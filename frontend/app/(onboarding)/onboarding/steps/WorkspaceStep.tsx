'use client';

import { BackgroundSelector } from '@/app/(main)/workspaces/components/BackgroundSelector';
import { CurrencySelector } from '@/app/(main)/workspaces/components/CurrencySelector';
import { AVAILABLE_BACKGROUNDS } from '@/app/(main)/workspaces/constants';
import { useIntlayer } from 'next-intlayer';
import { useEffect, useState } from 'react';

interface WorkspaceStepProps {
  workspaceName: string;
  workspaceCurrency: string;
  workspaceBackgroundImage: string | null;
  onWorkspaceNameChange: (value: string) => void;
  onWorkspaceCurrencyChange: (value: string) => void;
  onWorkspaceBackgroundImageChange: (value: string | null) => void;
  onCurrencyPickerOpenChange?: (open: boolean) => void;
}

export function WorkspaceStep({
  workspaceName,
  workspaceCurrency,
  workspaceBackgroundImage,
  onWorkspaceNameChange,
  onWorkspaceCurrencyChange,
  onWorkspaceBackgroundImageChange,
  onCurrencyPickerOpenChange,
}: WorkspaceStepProps) {
  const t = useIntlayer('onboardingPage' as any) as any;
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  useEffect(() => {
    onCurrencyPickerOpenChange?.(currencyPickerOpen);
  }, [currencyPickerOpen, onCurrencyPickerOpenChange]);

  useEffect(
    () => () => {
      onCurrencyPickerOpenChange?.(false);
    },
    [onCurrencyPickerOpenChange],
  );

  const isCustomBackground = Boolean(
    workspaceBackgroundImage && !AVAILABLE_BACKGROUNDS.includes(workspaceBackgroundImage),
  );

  if (currencyPickerOpen) {
    return (
      <section className="space-y-4">
        <div className="w-full">
          <CurrencySelector
            selectedCurrency={workspaceCurrency || null}
            onSelect={value => onWorkspaceCurrencyChange(value)}
            mode="inline"
            open={currencyPickerOpen}
            onOpenChange={setCurrencyPickerOpen}
            showLabel={false}
            showTrigger={false}
            minimal
          />

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setCurrencyPickerOpen(false)}
              className="inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {t.navigation.back}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{t.workspace.title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{t.workspace.subtitle}</p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
        <div className="space-y-2">
          <label
            className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            htmlFor="workspace-name"
          >
            {t.workspace.nameLabel}
          </label>
          <input
            id="workspace-name"
            type="text"
            value={workspaceName}
            onChange={event => onWorkspaceNameChange(event.target.value)}
            placeholder={t.workspace.namePlaceholder.value}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-1">
          <CurrencySelector
            selectedCurrency={workspaceCurrency || null}
            onSelect={value => onWorkspaceCurrencyChange(value)}
            mode="inline"
            open={currencyPickerOpen}
            onOpenChange={setCurrencyPickerOpen}
          />
          <p className="text-xs text-muted-foreground">{t.workspace.currencyHint}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t.workspace.backgroundLabel}
        </p>

        <BackgroundSelector
          selectedBackground={
            workspaceBackgroundImage && AVAILABLE_BACKGROUNDS.includes(workspaceBackgroundImage)
              ? workspaceBackgroundImage
              : null
          }
          onSelect={onWorkspaceBackgroundImageChange}
          backgrounds={AVAILABLE_BACKGROUNDS}
          compact
        />

        <div className="space-y-1.5">
          <label className="text-xs text-foreground" htmlFor="workspace-custom-background">
            {t.workspace.customBackgroundLabel}
          </label>
          <input
            id="workspace-custom-background"
            type="url"
            value={isCustomBackground ? workspaceBackgroundImage || '' : ''}
            onChange={event => onWorkspaceBackgroundImageChange(event.target.value || null)}
            placeholder={t.workspace.customBackgroundPlaceholder.value}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-muted-foreground">{t.workspace.customBackgroundHint}</p>
        </div>
      </div>
    </section>
  );
}
