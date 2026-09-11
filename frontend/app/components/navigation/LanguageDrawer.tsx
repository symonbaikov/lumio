'use client';

import React from 'react';
import { Check, ChevronLeft, Search } from '@/app/components/icons';
import { DrawerShell } from '@/app/components/ui/drawer-shell';

type LanguageDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  languageModal: { title: React.ReactNode };
  languageSearch: string;
  setLanguageSearch: (v: string) => void;
  filteredLanguages: { code: string; label: string }[];
  normalizedLocale: string;
  handleLanguageSelect: (code: string) => void;
};

// eslint-disable-next-line max-lines-per-function
export function LanguageDrawer({
  isOpen,
  onClose,
  languageModal,
  languageSearch,
  setLanguageSearch,
  filteredLanguages,
  normalizedLocale,
  handleLanguageSelect,
}: LanguageDrawerProps): React.JSX.Element {
  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="lumio-navigation__lang-header">
          <button
            type="button"
            onClick={onClose}
            className="lumio-navigation__lang-back-btn"
            aria-label="Close language drawer"
          >
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
          <span>{languageModal.title}</span>
        </div>
      }
      position="right"
      width="lg"
      showCloseButton={false}
    >
      <div className="lumio-navigation__lang-body">
        <div className="lumio-navigation__lang-scroll">
          <div className="lumio-navigation__lang-search-wrapper">
            <Search className="lumio-navigation__lang-search-icon" />
            <input
              type="text"
              value={languageSearch}
              onChange={e => {
                setLanguageSearch(e.target.value);
              }}
              placeholder="Search"
              className="lumio-navigation__lang-search-input"
            />
          </div>
          <div className="lumio-navigation__lang-list">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map(lang => {
                const selected = normalizedLocale === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      handleLanguageSelect(lang.code);
                    }}
                    className={`lumio-navigation__lang-option${selected ? ' lumio-navigation__lang-option--selected' : ''}`}
                  >
                    <span className="lumio-navigation__lang-option-label">{lang.label}</span>
                    {selected && (
                      <Check style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
                    )}
                  </button>
                );
              })
            ) : (
              <p className="lumio-navigation__lang-empty">No languages found</p>
            )}
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
