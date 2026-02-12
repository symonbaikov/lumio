import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { getIntlayer } from 'next-intlayer';
import { IntlayerServerProvider, getLocale } from 'next-intlayer/server';
import GlobalBreadcrumbs from './components/GlobalBreadcrumbs';
import GlobalNavHeight from './components/GlobalNavHeight';
import Navigation from './components/Navigation';
import { Providers } from './providers';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getIntlayer('layout', locale);

  return {
    title: t.title.value,
    description: t.description.value,
    icons: {
      icon: '/images/logo.svg',
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
      <body className="bg-background text-foreground antialiased">
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
                <GlobalBreadcrumbs />
              </div>
              <div
                aria-hidden="true"
                data-global-nav-spacer
                style={{ height: 'var(--global-nav-height, 0px)' }}
              />
              <main>{children}</main>
            </Providers>
          </ThemeProvider>
        </IntlayerServerProvider>
      </body>
    </html>
  );
}
