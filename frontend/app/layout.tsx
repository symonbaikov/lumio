import type { Metadata } from 'next';
import '@mantine/core/styles.css';
import { Manrope, Nunito } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { getIntlayer } from 'next-intlayer';
import { IntlayerServerProvider, getLocale } from 'next-intlayer/server';
import GlobalNavHeight from './components/GlobalNavHeight';
import Navigation from './components/Navigation';
import { Providers } from './providers';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
});

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-nunito',
});

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
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const resolvedLocale = typeof locale === 'string' ? locale : 'en';
  const direction = resolvedLocale.startsWith('ar') ? 'rtl' : 'ltr';

  return (
    <html lang={resolvedLocale} dir={direction} suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${nunito.variable} bg-background text-foreground antialiased font-sans`}
      >
        <IntlayerServerProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Providers initialLocale={resolvedLocale as 'en' | 'ru' | 'kk'}>
              <GlobalNavHeight />
              <div className="fixed top-0 inset-x-0 z-50" data-global-nav>
                <Navigation />
              </div>
              <div
                aria-hidden="true"
                data-global-nav-spacer
                style={{ height: 'var(--global-nav-height, 0px)' }}
              />
              <main>{children}</main>
              <div id="fab-portal" className="fixed inset-0 z-[300] pointer-events-none">
                <div className="relative h-full w-full" />
              </div>
            </Providers>
          </ThemeProvider>
        </IntlayerServerProvider>
      </body>
    </html>
  );
}
