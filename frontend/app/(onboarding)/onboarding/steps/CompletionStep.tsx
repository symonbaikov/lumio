'use client';

import { CheckCircle2 } from 'lucide-react';
import { useIntlayer } from "@/app/i18n";
import Image from 'next/image';
import type { SupportedLocale } from '../useOnboardingWizard';

interface ConnectedIntegration {
  key: string;
  title: string;
  iconSrc: string;
}

interface CompletionStepProps {
  locale: SupportedLocale;
  timeZone: string | null;
  workspaceName: string;
  workspaceCurrency: string;
  workspaceBackgroundImage: string | null;
  connectedIntegrations: ConnectedIntegration[];
}

export function CompletionStep({
  locale,
  timeZone,
  workspaceName,
  workspaceCurrency,
  workspaceBackgroundImage,
  connectedIntegrations,
}: CompletionStepProps) {
  const t = useIntlayer('onboardingPage' as any) as any;

  const localeLabel =
    locale === 'ru'
      ? t.language.localeOptions.ru.value
      : locale === 'kk'
        ? t.language.localeOptions.kk.value
        : t.language.localeOptions.en.value;

  return (
    <section className="space-y-6">
      <div className="inline-flex rounded-full border border-primary/30 bg-primary/10 p-3">
        <CheckCircle2 className="h-7 w-7 text-primary" />
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{t.completion.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t.completion.subtitle}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t.completion.summaryTitle}
        </p>
        <ul className="space-y-2 text-sm text-foreground">
          <li>{t.completion.summary.language.value.replace('{value}', localeLabel)}</li>
          <li>{t.completion.summary.timeZone.value.replace('{value}', timeZone || 'UTC')}</li>
          <li>{t.completion.summary.workspace.value.replace('{value}', workspaceName || '-')}</li>
          <li>
            {t.completion.summary.currency.value.replace(
              '{value}',
              workspaceCurrency || t.completion.notSet.value,
            )}
          </li>
          <li>
            {t.completion.summary.background.value.replace(
              '{value}',
              workspaceBackgroundImage
                ? t.completion.backgroundSet.value
                : t.completion.notSet.value,
            )}
          </li>
          <li>{t.completion.summary.integrations.value}</li>
        </ul>

        <div className="mt-4 border-t border-border pt-3">
          {connectedIntegrations.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {connectedIntegrations.map(integration => (
                <div
                  key={integration.key}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted"
                  title={integration.title}
                >
                  <Image
                    src={integration.iconSrc}
                    alt={integration.title}
                    width={18}
                    height={18}
                    className="rounded"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.completion.noIntegrations.value}</p>
          )}
        </div>
      </div>
    </section>
  );
}
