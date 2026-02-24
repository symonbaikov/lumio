'use client';

import { Button } from '@/app/components/ui/button';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { Check, ChevronLeft, Globe, Search } from 'lucide-react';
import { useIntlayer, useLocale } from 'next-intlayer';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

type AppLanguage = 'ru' | 'en' | 'kk';

export function AuthLanguageSwitcher() {
  const { locale, setLocale, availableLocales } = useLocale();
  const { languages: languageNames, languageModal } = useIntlayer('navigation');
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');

  useLockBodyScroll(languageModalOpen);

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

  const filteredLanguages = useMemo(() => {
    const query = languageSearch.trim().toLowerCase();
    if (!query) {
      return languages;
    }

    return languages.filter(lang => lang.label.toLowerCase().includes(query));
  }, [languageSearch, languages]);

  const handleLanguageSelect = (code: AppLanguage) => {
    setLocale(code);
    setLanguageModalOpen(false);
    setLanguageSearch('');
    const selectedLabel = languages.find(l => l.code === code)?.label ?? languageNames.ru.value;
    toast.success(`${languageModal.savedToastPrefix.value}: ${selectedLabel}`);
    setTimeout(() => {
      window.location.reload();
    }, 50);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground rounded-full"
        aria-label={currentLanguageLabel}
        onClick={() => {
          setLanguageSearch('');
          setLanguageModalOpen(true);
        }}
      >
        <Globe size={20} suppressHydrationWarning />
      </Button>

      <DrawerShell
        isOpen={languageModalOpen}
        onClose={() => {
          setLanguageModalOpen(false);
          setLanguageSearch('');
        }}
        title={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setLanguageModalOpen(false);
                setLanguageSearch('');
              }}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close language drawer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span>{languageModal.title}</span>
          </div>
        }
        position="right"
        width="lg"
        showCloseButton={false}
        className="max-w-full border-l-0 bg-[#fbfaf8] sm:max-w-lg"
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={languageSearch}
                onChange={event => setLanguageSearch(event.target.value)}
                placeholder="Search"
                className="w-full rounded-2xl border border-primary bg-white py-3 pl-11 pr-4 text-base text-gray-900 outline-none"
              />
            </div>

            <div className="space-y-2">
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map(lang => {
                  const selected = ((locale || 'ru') as AppLanguage) === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                        selected
                          ? 'bg-[#ebe8e2] text-foreground'
                          : 'text-foreground hover:bg-[#f1efea]'
                      }`}
                    >
                      <span className="font-medium">{lang.label}</span>
                      {selected ? <Check className="h-5 w-5 text-primary" /> : null}
                    </button>
                  );
                })
              ) : (
                <p className="rounded-xl bg-white px-4 py-3 text-sm text-gray-500">
                  No languages found
                </p>
              )}
            </div>
          </div>
        </div>
      </DrawerShell>
    </>
  );
}
