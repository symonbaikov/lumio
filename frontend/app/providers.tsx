"use client";

import { MantineProvider } from "@mantine/core";
import { ThemeProvider } from "@mui/material/styles";
import { IntlayerClientProvider } from "next-intlayer";
import { useTheme as useNextTheme } from "next-themes";
import React, { useEffect, useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";
import { SidePanelProvider } from "./components/side-panel";
import { NotificationProvider } from "./contexts/NotificationContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { useHTMLLanguage } from "./hooks/useHTMLLanguage";
import { mantineCssVariablesResolver, mantineTheme } from "./mantine-theme";
import { createAppTheme } from "./theme";
import { TourAutoStarter } from "./tours/components/TourAutoStarter";

type AppLocale = "en" | "ru" | "kk";

function HTMLLanguageSync() {
  useHTMLLanguage();
  return null;
}

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
}) {
  const { resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<AppLocale>(initialLocale);
  const paletteMode = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const colorScheme = paletteMode === "dark" ? "dark" : "light";
  const muiTheme = useMemo(() => createAppTheme(paletteMode), [paletteMode]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocale(initialLocale);
  }, [initialLocale]);

  return (
    <IntlayerClientProvider
      locale={locale}
      setLocale={(nextLocale) => setLocale(nextLocale as AppLocale)}
    >
      <HTMLLanguageSync />
      <TourAutoStarter />
      <MantineProvider
        theme={mantineTheme}
        cssVariablesResolver={mantineCssVariablesResolver}
        forceColorScheme={colorScheme}
        defaultColorScheme="light"
      >
        <ThemeProvider theme={muiTheme}>
          <WorkspaceProvider>
            <NotificationProvider>
              <SidePanelProvider
                defaultWidth="md"
                defaultPosition="left"
                defaultCollapsed={false}
                persistState={true}
                storageKey="lumio-side-panel"
              >
                {mounted ? (
                  <Toaster
                    position="top-center"
                    toastOptions={{
                      duration: 3000,
                      style: {
                        fontSize: "14px",
                        background: "var(--card-bg)",
                        color: "var(--foreground)",
                        border: "1px solid var(--border-color)",
                      },
                    }}
                  />
                ) : null}
                {children}
              </SidePanelProvider>
            </NotificationProvider>
          </WorkspaceProvider>
        </ThemeProvider>
      </MantineProvider>
    </IntlayerClientProvider>
  );
}
