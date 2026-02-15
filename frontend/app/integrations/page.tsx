'use client';

import apiClient from '@/app/lib/api';
import { CheckCircle2, ExternalLink, Plug, Search } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function IntegrationsPage() {
  const t = useIntlayer('integrationsPage');
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Static integration metadata (labels, icons, actions). Active/connect status is fetched from backend.
  const integrationMeta = useMemo(
    () => [
      {
        key: 'dropbox',
        name: 'Dropbox',
        description: t.cards.dropbox.description,
        badge: t.cards.dropbox.badge,
        category: 'storage',
        icon: (
          <Image
            src="/icons/dropbox-icon.png"
            alt="Dropbox"
            width={32}
            height={32}
            className="rounded"
          />
        ),
        actions: [
          {
            label: t.cards.dropbox.actions.connect,
            href: '/integrations/dropbox',
            primary: true,
          },
          {
            label: t.cards.dropbox.actions.docs,
            href: 'https://www.dropbox.com/developers/documentation',
            external: true,
          },
        ],
      },
      {
        key: 'google-drive',
        name: 'Google Drive',
        description: t.cards.googleDrive.description,
        badge: t.cards.googleDrive.badge,
        category: 'storage',
        icon: (
          <Image
            src="/icons/google-drive-icon.png"
            alt="Google Drive"
            width={32}
            height={32}
            className="rounded"
          />
        ),
        actions: [
          {
            label: t.cards.googleDrive.actions.connect,
            href: '/integrations/google-drive',
            primary: true,
          },
          {
            label: t.cards.googleDrive.actions.docs,
            href: 'https://developers.google.com/drive/api/guides/about-sdk',
            external: true,
          },
        ],
      },
      {
        key: 'gmail',
        name: 'Gmail',
        description: 'Automatically import receipts and invoices from your Gmail inbox',
        badge: 'Active',
        category: 'email',
        icon: (
          <Image src="/icons/gmail.png" alt="Gmail" width={32} height={32} className="rounded" />
        ),
        actions: [
          {
            label: 'Connect',
            href: '/integrations/gmail',
            primary: true,
          },
          {
            label: 'Docs',
            href: 'https://developers.google.com/gmail/api',
            external: true,
          },
        ],
      },
      {
        key: 'google-sheets',
        name: 'Google Sheets',
        description: t.cards.googleSheets.description,
        badge: t.cards.googleSheets.badge,
        category: 'spreadsheets',
        icon: (
          <Image
            src="/icons/icons8-google-sheets-48.png"
            alt="Google Sheets"
            width={32}
            height={32}
            className="rounded"
          />
        ),
        actions: [
          {
            label: t.cards.googleSheets.actions.connect,
            href: '/integrations/google-sheets',
            primary: true,
          },
          {
            label: t.cards.googleSheets.actions.docs,
            href: 'https://support.google.com/docs',
            external: true,
          },
        ],
      },
      {
        key: 'telegram',
        name: 'Telegram',
        description: t.cards.telegram.description,
        badge: t.cards.telegram.badge,
        category: 'messaging',
        icon: (
          <Image
            src="/icons/icons8-telegram-48.png"
            alt="Telegram"
            width={32}
            height={32}
            className="rounded"
          />
        ),
        actions: [
          { label: t.cards.telegram.actions.setup, href: '/settings/telegram', primary: true },
          {
            label: t.cards.telegram.actions.guide,
            href: 'https://core.telegram.org/bots',
            external: true,
          },
        ],
      },
    ],
    [t],
  );

  // Integration statuses fetched from backend per-integration
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;

    const loadStatuses = async () => {
      const map: Record<string, boolean> = {};

      await Promise.all(
        integrationMeta.map(async m => {
          try {
            // Try to call per-integration status endpoint. Backend endpoints used elsewhere:
            // e.g. /integrations/dropbox/status, /integrations/google-drive/status, /integrations/gmail/status
            const resp = await apiClient.get(`/integrations/${m.key}/status`);
            const data = resp.data || {};
            // Support different shapes: { connected: boolean } or { status: 'connected' | ... }
            const connected =
              Boolean(data?.connected) || String(data?.status)?.toLowerCase() === 'connected';
            map[m.key] = connected;
          } catch (err) {
            // If endpoint missing or error, treat as not connected
            map[m.key] = false;
          }
        }),
      );

      if (mounted) {
        setIntegrationStatuses(prev => ({ ...prev, ...map }));
      }
    };

    loadStatuses();

    return () => {
      mounted = false;
    };
  }, [integrationMeta]);

  // Merge metadata with fetched statuses to produce final integrations list used for filtering/display.
  const integrations = useMemo(
    () =>
      integrationMeta.map(m => ({
        ...m,
        active: integrationStatuses[m.key] ?? false,
        primaryAction: m.actions.find(action => action.primary) ?? m.actions[0],
      })),
    [integrationMeta, integrationStatuses],
  );

  const filteredIntegrations = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return integrations;

    return integrations.filter(
      item =>
        item.name.toLowerCase().includes(query) ||
        String(item.description).toLowerCase().includes(query),
    );
  }, [integrations, searchQuery]);

  const handleCardClick = (item: (typeof integrations)[number]) => {
    if (!item.primaryAction?.href || item.primaryAction.external) return;
    router.push(item.primaryAction.href);
  };

  const active = filteredIntegrations.filter(item => item.active);
  const available = filteredIntegrations.filter(item => !item.active);

  const categories = [
    {
      key: 'storage',
      label: t.categories.storage,
    },
    {
      key: 'email',
      label: t.categories.email,
    },
    {
      key: 'spreadsheets',
      label: t.categories.spreadsheets,
    },
    {
      key: 'messaging',
      label: t.categories.messaging,
    },
  ] as const;

  const groupByCategory = <T extends { category: string }>(items: T[]) => {
    const grouped = new Map<string, T[]>();
    for (const item of items) {
      const next = grouped.get(item.category) ?? [];
      next.push(item);
      grouped.set(item.category, next);
    }
    return grouped;
  };

  const activeByCategory = groupByCategory(active);
  const availableByCategory = groupByCategory(available);

  return (
    <div className="container-shared px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <Plug className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-secondary mt-1">{t.subtitle}</p>
          </div>
        </div>

        <div className="relative w-full max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-full border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Поиск интеграций..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-8">
        {active.length > 0 || !searchQuery ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t.sections.connected}</h3>
            {active.length === 0 && !searchQuery ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                {t.empty.connected}
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map((category, index) => {
                  const items = activeByCategory.get(category.key) ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div key={`active-${category.key}`}>
                      {index !== 0 && (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-px flex-1 bg-gray-200" />
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 px-3 py-1 rounded-full border border-gray-200 bg-white">
                            {category.label}
                          </span>
                          <div className="h-px flex-1 bg-gray-200" />
                        </div>
                      )}
                      {index === 0 && (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-px flex-1 bg-gray-200" />
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 px-3 py-1 rounded-full border border-gray-200 bg-white">
                            {category.label}
                          </span>
                          <div className="h-px flex-1 bg-gray-200" />
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {items.map(item => (
                          <div
                            key={item.key}
                            data-integration-card={item.key}
                            role={item.primaryAction?.href && !item.primaryAction.external ? 'button' : undefined}
                            tabIndex={item.primaryAction?.href && !item.primaryAction.external ? 0 : undefined}
                            className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            onClick={() => handleCardClick(item)}
                            onKeyDown={event => {
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              handleCardClick(item);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                                {item.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h2 className="text-lg font-semibold text-gray-900">
                                    {item.name}
                                  </h2>
                                  <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> {item.badge}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {item.actions.map(action =>
                                    action.external ? (
                                      <a
                                        key={action.href}
                                        href={action.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={event => event.stopPropagation()}
                                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                                      >
                                        {action.label}
                                        <ExternalLink className="h-3 w-3 ml-1 text-gray-400" />
                                      </a>
                                    ) : (
                                      action.primary && item.active ? (
                                        <button
                                          key={action.href}
                                          type="button"
                                          disabled
                                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 text-gray-400 cursor-not-allowed"
                                          onClick={event => event.stopPropagation()}
                                        >
                                          {action.label}
                                        </button>
                                      ) : (
                                        <Link
                                          key={action.href}
                                          href={action.href}
                                          onClick={event => event.stopPropagation()}
                                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border border-primary text-primary hover:bg-primary/10 transition-colors"
                                        >
                                          {action.label}
                                        </Link>
                                      )
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {available.length > 0 || !searchQuery ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t.sections.available}</h3>
            {available.length === 0 && !searchQuery ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                {t.empty.available}
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map(category => {
                  const items = availableByCategory.get(category.key) ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div key={`available-${category.key}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 px-3 py-1 rounded-full border border-gray-200 bg-white">
                          {category.label}
                        </span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {items.map(item => (
                          <div
                            key={item.key}
                            data-integration-card={item.key}
                            role={item.primaryAction?.href && !item.primaryAction.external ? 'button' : undefined}
                            tabIndex={item.primaryAction?.href && !item.primaryAction.external ? 0 : undefined}
                            className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            onClick={() => handleCardClick(item)}
                            onKeyDown={event => {
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              handleCardClick(item);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                                {item.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h2 className="text-lg font-semibold text-gray-900">
                                    {item.name}
                                  </h2>
                                  <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> {item.badge}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {item.actions.map(action =>
                                    action.external ? (
                                      <a
                                        key={action.href}
                                        href={action.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={event => event.stopPropagation()}
                                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                                      >
                                        {action.label}
                                        <ExternalLink className="h-3 w-3 ml-1 text-gray-400" />
                                      </a>
                                    ) : (
                                      action.primary && item.active ? (
                                        <button
                                          key={action.href}
                                          type="button"
                                          disabled
                                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 text-gray-400 cursor-not-allowed"
                                          onClick={event => event.stopPropagation()}
                                        >
                                          {action.label}
                                        </button>
                                      ) : (
                                        <Link
                                          key={action.href}
                                          href={action.href}
                                          onClick={event => event.stopPropagation()}
                                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border border-primary text-primary hover:bg-primary/10 transition-colors"
                                        >
                                          {action.label}
                                        </Link>
                                      )
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {searchQuery && filteredIntegrations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Ничего не найдено</h3>
            <p className="text-gray-500 mt-1">
              По запросу «{searchQuery}» нет подходящих интеграций.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-sm font-semibold text-primary hover:underline"
            >
              Сбросить поиск
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
