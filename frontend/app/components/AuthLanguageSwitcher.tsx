'use client';

import { Button } from '@/app/components/ui/button';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useIntlayer, useLocale } from 'next-intlayer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

type AppLanguage = 'ru' | 'en' | 'kk';

export function AuthLanguageSwitcher() {
  const { locale, setLocale, availableLocales } = useLocale();
  const { languages: languageNames, languageModal } = useIntlayer('navigation');
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [languageDraft, setLanguageDraft] = useState<AppLanguage>((locale as AppLanguage) || 'ru');
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(languageModalOpen);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!languageDropdownOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!languageDropdownRef.current) return;
      if (!languageDropdownRef.current.contains(event.target as Node)) {
        setLanguageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [languageDropdownOpen]);

  const languages = useMemo(
    () =>
      [
        {
          code: 'ru' as const,
          label: languageNames.ru.value,
          note: languageModal.defaultLanguageNote.value,
        },
        { code: 'en' as const, label: languageNames.en.value },
        { code: 'kk' as const, label: languageNames.kk.value },
      ].filter(l => availableLocales.map(String).includes(l.code)),
    [availableLocales, languageModal.defaultLanguageNote, languageNames],
  );

  const currentLanguageLabel = useMemo(() => {
    const currentCode = (locale || 'ru') as AppLanguage;
    return languages.find(l => l.code === currentCode)?.label ?? languageNames.ru.value;
  }, [locale, languages, languageNames.ru.value]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground rounded-full"
        aria-label={currentLanguageLabel}
        onClick={() => {
          setLanguageDraft((locale as AppLanguage) || 'ru');
          setLanguageModalOpen(true);
        }}
      >
        <Globe size={20} suppressHydrationWarning />
      </Button>

      {portalReady &&
        languageModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-80 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/30"
              role="button"
              tabIndex={0}
              onClick={() => setLanguageModalOpen(false)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setLanguageModalOpen(false);
                }
              }}
            />

            <div className="relative w-full max-w-lg rounded-2xl bg-card text-card-foreground shadow-xl ring-1 ring-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  {languageModal.sectionLabel}
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {languageModal.title}
                </div>
                <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                  {languageModal.availableLanguagesLabel}
                </div>
              </div>

              <div className="px-5 py-4">
                <div ref={languageDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setLanguageDropdownOpen(prev => !prev)}
                    className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-base hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {languages.find(l => l.code === languageDraft)?.label ??
                          languageNames.ru.value}
                      </span>
                    </div>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </button>

                  {languageDropdownOpen && (
                    <div className="transition-[max-height] duration-200 ease-out max-h-64 mt-3">
                      <div className="rounded-xl border border-border bg-card shadow-lg max-h-64 overflow-y-auto">
                        {languages.map(lang => {
                          const selected = languageDraft === lang.code;
                          return (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => {
                                setLanguageDraft(lang.code);
                                setLanguageDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                selected
                                  ? 'bg-primary/10 text-foreground'
                                  : 'hover:bg-muted text-foreground'
                              }`}
                            >
                              <span className="flex-1 font-medium">{lang.label}</span>
                              {selected && (
                                <span className="flex items-center gap-1 text-xs text-primary">
                                  <Check size={14} />
                                  {languageModal.savedToastPrefix.value}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-4 border-t border-border flex justify-end gap-2 bg-muted/50">
                <button
                  onClick={() => setLanguageModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-border text-foreground hover:bg-muted transition-colors text-sm"
                >
                  {languageModal.cancel}
                </button>
                <button
                  onClick={() => {
                    setLocale(languageDraft);
                    setLanguageModalOpen(false);
                    const selectedLabel =
                      languages.find(l => l.code === languageDraft)?.label ??
                      languageNames.ru.value;
                    toast.success(`${languageModal.savedToastPrefix.value}: ${selectedLabel}`);
                    setTimeout(() => {
                      window.location.reload();
                    }, 50);
                  }}
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover transition-colors text-sm"
                >
                  {languageModal.save}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
