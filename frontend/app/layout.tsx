import type { Metadata } from 'next';
import { Geist, Geist_Mono, Manrope, Nunito } from 'next/font/google';
import './globals.scss';
import { ThemeProvider } from '@/components/theme-provider';
import { getLocale } from 'next-intlayer/server';
import { getIntlayer } from 'react-intlayer';
import { IntlayerServerProvider } from 'react-intlayer/server';
import { ChatModeRedirect } from './chat/ChatModeRedirect';
import AppChrome from './components/AppChrome';
import DynamicPageTitle from './components/DynamicPageTitle';
import TopBar from './components/TopBar';
import MobileBottomBar from './components/mobile/MobileBottomBar';
import { normalizeLocale } from './lib/locale';
import { Providers } from './providers';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
});

// Keep Nunito for branding elements
const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-nunito',
});

const FONT_CLASS_NAMES = [
  geist.variable,
  geistMono.variable,
  manrope.variable,
  nunito.variable,
].join(' ');
const BODY_STYLE: React.CSSProperties = {
  background: 'var(--background)',
  color: 'var(--foreground)',
  WebkitFontSmoothing: 'antialiased',
  fontFamily: 'var(--font-geist, system-ui, sans-serif)',
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getIntlayer('layout', locale);

  return {
    title: t.title.value,
    description: t.description.value,
    icons: {
      icon: '/images/favicon-new.png',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const locale = await getLocale();
  const resolvedLocale = normalizeLocale(typeof locale === 'string' ? locale : undefined);
  const direction = resolvedLocale.startsWith('ar') ? 'rtl' : 'ltr';

  return (
    <html lang={resolvedLocale} dir={direction} suppressHydrationWarning>
      <body className={FONT_CLASS_NAMES} style={BODY_STYLE} suppressHydrationWarning>
        <IntlayerServerProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Providers initialLocale={resolvedLocale}>
              <ChatModeRedirect />
              <DynamicPageTitle />
              <div className="lumio-shell">
                <AppChrome />
                <div className="lumio-shell__content">
                  <TopBar />
                  <main>{children}</main>
                  <MobileBottomBar />
                  <div
                    id="fab-portal"
                    style={{ position: 'fixed', inset: 0, zIndex: 300, pointerEvents: 'none' }}
                  >
                    <div style={{ position: 'relative', height: '100%', width: '100%' }} />
                  </div>
                </div>
              </div>
            </Providers>
          </ThemeProvider>
        </IntlayerServerProvider>
      </body>
    </html>
  );
}
