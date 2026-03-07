'use client';

import { CheckCircle2, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { useIntlayer } from "@/app/i18n";

export function WelcomeStep() {
  const t = useIntlayer('onboardingPage' as any) as any;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {t.welcome.title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          {t.welcome.subtitle}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-medium text-foreground">{t.welcome.points.fastSetup}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <Workflow className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {t.welcome.points.integrations}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-medium text-foreground">{t.welcome.points.control}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">{t.welcome.nextTitle}</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {t.welcome.nextSteps.language}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {t.welcome.nextSteps.workspace}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {t.welcome.nextSteps.integrations}
          </li>
        </ul>
      </div>
    </section>
  );
}
