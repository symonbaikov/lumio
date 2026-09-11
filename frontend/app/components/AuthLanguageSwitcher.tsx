'use client';

import IconButton from '@mui/material/IconButton';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, ChevronLeft, Globe, Search } from '@/app/components/icons';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { useIntlayer, useLocale } from '@/app/i18n';
import { type AppLocale as AppLanguage, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/app/lib/locale';
import { tokens } from '@/lib/theme-tokens';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, max-lines-per-function
export function AuthLanguageSwitcher() {
  const { locale, setLocale, availableLocales } = useLocale();
  const { languages: languageNames, languageModal } = useIntlayer('navigation');
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');

  useLockBodyScroll(languageModalOpen);

  const languages = useMemo(() => {
    const available = availableLocales.map(String);
    return SUPPORTED_LOCALES.filter(code => available.includes(code)).map(code => ({
      code,
      label: (languageNames as Record<string, { value: string }>)[code]?.value ?? code,
      ...(code === DEFAULT_LOCALE ? { note: languageModal.defaultLanguageNote.value } : {}),
    }));
  }, [availableLocales, languageModal.defaultLanguageNote, languageNames]);

  const currentLanguageLabel = useMemo(() => {
    const currentCode = (locale || DEFAULT_LOCALE) as AppLanguage;
    return (
      languages.find(l => l.code === currentCode)?.label ??
      (languageNames as Record<string, { value: string }>)[DEFAULT_LOCALE]?.value ??
      DEFAULT_LOCALE
    );
  }, [locale, languages, languageNames]);

  const filteredLanguages = useMemo(() => {
    const query = languageSearch.trim().toLowerCase();
    if (!query) {
      return languages;
    }

    return languages.filter(lang => lang.label.toLowerCase().includes(query));
  }, [languageSearch, languages]);

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleLanguageSelect = (code: AppLanguage) => {
    setLocale(code);
    setLanguageModalOpen(false);
    setLanguageSearch('');
    const selectedLabel =
      languages.find(l => l.code === code)?.label ??
      (languageNames as Record<string, { value: string }>)[DEFAULT_LOCALE]?.value ??
      DEFAULT_LOCALE;
    toast.success(`${languageModal.savedToastPrefix.value}: ${selectedLabel}`);
    setTimeout(() => {
      window.location.reload();
    }, 50);
  };

  return (
    <>
      <IconButton
        aria-label={currentLanguageLabel}
        onClick={() => {
          setLanguageSearch('');
          setLanguageModalOpen(true);
        }}
        sx={{
          width: 48,
          height: 48,
          borderRadius: `${tokens.radius.full} !important`,
          color: 'text.secondary',
          '&:hover': {
            borderRadius: `${tokens.radius.full} !important`,
            color: 'text.primary',
          },
        }}
      >
        <Globe size={20} suppressHydrationWarning />
      </IconButton>

      <DrawerShell
        isOpen={languageModalOpen}
        onClose={() => {
          setLanguageModalOpen(false);
          setLanguageSearch('');
        }}
        title={
          <div className="lumio-language-switcher__drawer-title">
            <button
              type="button"
              onClick={() => {
                setLanguageModalOpen(false);
                setLanguageSearch('');
              }}
              className="lumio-language-switcher__back-btn"
              aria-label="Close language drawer"
            >
              <ChevronLeft size={20} />
            </button>
            <span>{languageModal.title}</span>
          </div>
        }
        position="right"
        width="lg"
        showCloseButton={false}
        className="lumio-language-switcher__shell"
      >
        <div className="lumio-language-switcher__body">
          <div className="lumio-language-switcher__scroll-area">
            <div className="lumio-language-switcher__search-wrapper">
              <Search
                className="lumio-language-switcher__search-icon"
                style={{ width: 20, height: 20 }}
              />
              <input
                type="text"
                value={languageSearch}
                onChange={event => setLanguageSearch(event.target.value)}
                placeholder="Search"
                className="lumio-language-switcher__search-input"
              />
            </div>

            <div className="lumio-language-switcher__list">
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map(lang => {
                  const selected = ((locale || 'ru') as AppLanguage) === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={`lumio-language-switcher__lang-btn${selected ? ' lumio-language-switcher__lang-btn--selected' : ''}`}
                    >
                      <span className="lumio-language-switcher__lang-label">{lang.label}</span>
                      {selected ? <Check size={20} style={{ color: 'var(--primary)' }} /> : null}
                    </button>
                  );
                })
              ) : (
                <p className="lumio-language-switcher__empty">No languages found</p>
              )}
            </div>
          </div>
        </div>
      </DrawerShell>
    </>
  );
}
