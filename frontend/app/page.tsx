'use client';

import { CalendarDays, Clock3, FileText } from 'lucide-react';
import { useIntlayer, useLocale } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { type ChangelogEntry, ChangelogModal } from './components/ChangelogModal';
import { useWorkspace } from './contexts/WorkspaceContext';
import { useAuth } from './hooks/useAuth';

interface ChangelogPayload {
  entries?: ChangelogEntry[];
}

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { locale } = useLocale();
  const t = useIntlayer('homePage');

  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<ChangelogEntry | null>(null);
  const needsOnboarding = user?.onboardingCompletedAt == null;

  useEffect(() => {
    if (authLoading || workspaceLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (needsOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (!currentWorkspace) {
      router.replace('/workspaces');
    }
  }, [authLoading, currentWorkspace, needsOnboarding, router, user, workspaceLoading]);

  useEffect(() => {
    if (!user || !currentWorkspace) {
      return;
    }

    let cancelled = false;

    const loadChangelog = async () => {
      try {
        setLoadingEntries(true);
        const response = await fetch('/changelog.json', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`Failed to load changelog: ${response.status}`);
        }

        const payload = (await response.json()) as ChangelogPayload;

        if (cancelled) {
          return;
        }

        const normalizedEntries = Array.isArray(payload.entries) ? payload.entries : [];
        setEntries(normalizedEntries);
      } catch {
        if (!cancelled) {
          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingEntries(false);
        }
      }
    };

    void loadChangelog();

    return () => {
      cancelled = true;
    };
  }, [currentWorkspace, user]);

  const isRedirecting =
    authLoading || workspaceLoading || !user || needsOnboarding || !currentWorkspace;

  const formattedEntries = useMemo(() => {
    return entries.map(entry => {
      const date = new Date(entry.date);
      const formattedDate = Number.isNaN(date.getTime())
        ? entry.date
        : new Intl.DateTimeFormat(locale || 'ru', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }).format(date);

      return {
        ...entry,
        dateLabel: formattedDate,
      };
    });
  }, [entries, locale]);

  const toPlainText = (value: unknown) => {
    if (typeof value === 'string') {
      return value;
    }

    if (value && typeof value === 'object' && 'value' in value) {
      const tokenValue = (value as { value?: string }).value;
      if (typeof tokenValue === 'string') {
        return tokenValue;
      }
    }

    return '';
  };

  const releaseLabelText = toPlainText(t.releaseLabel);
  const closeLabelText = toPlainText(t.closeLabel);

  if (isRedirecting) {
    return (
      <div className="flex min-h-[calc(100vh-var(--global-nav-height,0px))] items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#d8e3d8] border-t-[#0f3428]" />
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-var(--global-nav-height,0px))] bg-background">
      <div className="container-shared px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <header className="mb-6 rounded-2xl border border-[#d8e4d9] bg-white/85 px-5 py-6 backdrop-blur-sm sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e7468]">
            {t.badge}
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-[#103528] sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#5a7164] sm:text-base">{t.description}</p>
        </header>

        {loadingEntries ? (
          <div className="rounded-2xl border border-[#d8e4d9] bg-white px-5 py-8 text-sm text-[#5a7164]">
            {t.loading}
          </div>
        ) : formattedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cddbcf] bg-white px-5 py-14 text-center">
            <FileText className="mb-3 h-8 w-8 text-[#89a093]" />
            <p className="text-sm font-medium text-[#314c3f]">{t.empty}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {formattedEntries.map(entry => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedEntry(entry)}
                className="w-full rounded-2xl border border-[#d8e4d9] bg-white px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bdd2c1] hover:bg-[#fdfefd]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-[#123528]">
                      {entry.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5a7064]">
                      {entry.summary}
                    </p>
                  </div>

                  {entry.version ? (
                    <span className="shrink-0 rounded-full border border-[#d3e1d5] bg-[#f3f9f4] px-3 py-1 text-xs font-semibold text-[#365848]">
                      {entry.version}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#607266]">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {entry.dateLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {t.openDetails}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ChangelogModal
        isOpen={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
        releaseLabel={releaseLabelText}
        closeLabel={closeLabelText}
      />
    </main>
  );
}
