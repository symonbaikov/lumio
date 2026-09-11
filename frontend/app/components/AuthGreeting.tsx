'use client';

import { Box, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { type AppLocale, SUPPORTED_LOCALES } from '@/app/lib/locale';

const AUTH_GREETINGS = {
  ru: 'Добро пожаловать',
  en: 'Welcome',
  kk: 'Қош келдіңіз',
  zh: '欢迎',
  de: 'Willkommen',
  fr: 'Bienvenue',
  es: 'Bienvenido',
  uk: 'Ласкаво просимо',
  pl: 'Witaj',
  sk: 'Vitajte',
  pt: 'Bem-vindo',
  tr: 'Hoş geldiniz',
  ar: 'مرحباً',
  it: 'Benvenuto',
  ja: 'ようこそ',
  ko: '환영합니다',
  hi: 'स्वागत है',
  nl: 'Welkom',
  sv: 'Välkommen',
  vi: 'Chào mừng',
  id: 'Selamat datang',
} satisfies Record<AppLocale, string>;

const AUTH_GREETING_ITEMS = SUPPORTED_LOCALES.map(locale => ({
  locale,
  text: AUTH_GREETINGS[locale],
}));

type AuthGreetingItem = (typeof AUTH_GREETING_ITEMS)[number];

function AnimatedGreeting({ greeting }: { greeting: AuthGreetingItem }): React.JSX.Element {
  return (
    <motion.div
      key={greeting.locale}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ position: 'absolute', width: '100%', textAlign: 'center' }}
    >
      <Typography
        component="h1"
        variant="h4"
        fontWeight="800"
        color="text.primary"
        lang={greeting.locale}
        dir={greeting.locale === 'ar' ? 'rtl' : 'ltr'}
        sx={{
          lineHeight: 1.2,
          px: 1,
          overflowWrap: 'break-word',
        }}
      >
        {greeting.text}
      </Typography>
    </motion.div>
  );
}

export function AuthGreeting(): React.JSX.Element {
  const [greetingIndex, setGreetingIndex] = useState(0);
  const greeting = AUTH_GREETING_ITEMS[greetingIndex] ?? AUTH_GREETING_ITEMS[0];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setGreetingIndex(prev => (prev + 1) % AUTH_GREETING_ITEMS.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        height: 54,
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        position: 'relative',
        width: '100%',
      }}
    >
      <AnimatePresence mode="wait">
        <AnimatedGreeting greeting={greeting} />
      </AnimatePresence>
    </Box>
  );
}
