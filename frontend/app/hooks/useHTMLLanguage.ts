'use client';

import { useLocale } from '@/app/i18n';
import { getHTMLTextDir } from 'intlayer';
import { useEffect } from 'react';

export function useHTMLLanguage() {
  const { locale } = useLocale();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
    document.documentElement.dir = getHTMLTextDir(locale);
  }, [locale]);
}
