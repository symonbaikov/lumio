'use client';

import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import { PanelLeftOpen, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import React from 'react';
import { SidePanel, SidePanelProvider, useCurrentSidePanelConfig, useSidePanel } from './index';

type ClonableProps = Record<string, unknown>;
const MOBILE_MENU_VISIBILITY_EVENT = 'lumio-mobile-menu-visibility';
const SIDEPANEL_ACTIVE_BODY_ATTRIBUTE = 'data-side-panel-active';

function MainSidePanelLayoutInner({ children }: { children: React.ReactNode }) {
  const config = useCurrentSidePanelConfig();
  const sidePanel = useSidePanel();
  const pathname = usePathname();
  const isStatementsPage = pathname?.startsWith('/statements');
  const [mobileSidePanelOpen, setMobileSidePanelOpen] = React.useState(false);
  const [mobileSidePanelMounted, setMobileSidePanelMounted] = React.useState(false);
  const [mobileSidePanelVisible, setMobileSidePanelVisible] = React.useState(false);
  const [globalMobileMenuOpen, setGlobalMobileMenuOpen] = React.useState(false);
  const [mobilePanelDragX, setMobilePanelDragX] = React.useState(0);
  const touchStartXRef = React.useRef<number | null>(null);
  const touchStartYRef = React.useRef<number | null>(null);
  const dragActiveRef = React.useRef(false);

  useLockBodyScroll(mobileSidePanelOpen);

  React.useEffect(() => {
    if (sidePanel.position !== 'left') {
      sidePanel.setPosition('left');
    }
  }, [sidePanel]);

  React.useEffect(() => {
    setMobileSidePanelOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!mobileSidePanelOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileSidePanelOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileSidePanelOpen]);

  React.useEffect(() => {
    if (!mobileSidePanelOpen) {
      setMobilePanelDragX(0);
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      dragActiveRef.current = false;
    }
  }, [mobileSidePanelOpen]);

  React.useEffect(() => {
    if (mobileSidePanelOpen) {
      setMobileSidePanelMounted(true);
      const frame = window.requestAnimationFrame(() => {
        setMobileSidePanelVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    if (!mobileSidePanelMounted) {
      return;
    }

    setMobileSidePanelVisible(false);
    const timer = window.setTimeout(() => {
      setMobileSidePanelMounted(false);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mobileSidePanelOpen, mobileSidePanelMounted]);

  React.useEffect(() => {
    const handleMenuVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      setGlobalMobileMenuOpen(Boolean(customEvent.detail?.open));
    };

    window.addEventListener(MOBILE_MENU_VISIBILITY_EVENT, handleMenuVisibility);

    return () => {
      window.removeEventListener(MOBILE_MENU_VISIBILITY_EVENT, handleMenuVisibility);
    };
  }, []);

  React.useEffect(() => {
    if (globalMobileMenuOpen) {
      setMobileSidePanelOpen(false);
    }
  }, [globalMobileMenuOpen]);

  React.useLayoutEffect(() => {
    if (typeof document === 'undefined') return;

    document.body.setAttribute(SIDEPANEL_ACTIVE_BODY_ATTRIBUTE, config ? 'true' : 'false');

    return () => {
      document.body.setAttribute(SIDEPANEL_ACTIVE_BODY_ATTRIBUTE, 'false');
    };
  }, [config]);

  const handlePanelTouchStart = React.useCallback(
    (event: React.TouchEvent<HTMLDialogElement>) => {
      if (!mobileSidePanelVisible) return;
      if (event.touches.length !== 1) return;
      touchStartXRef.current = event.touches[0]?.clientX ?? null;
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
      dragActiveRef.current = true;
    },
    [mobileSidePanelVisible],
  );

  const handlePanelTouchMove = React.useCallback((event: React.TouchEvent<HTMLDialogElement>) => {
    if (!dragActiveRef.current) return;
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX >= 0) {
      setMobilePanelDragX(0);
      return;
    }

    event.preventDefault();
    setMobilePanelDragX(Math.max(-240, deltaX));
  }, []);

  const handlePanelTouchEnd = React.useCallback(() => {
    if (!dragActiveRef.current) return;

    const shouldClose = mobilePanelDragX < -72;

    dragActiveRef.current = false;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    setMobilePanelDragX(0);

    if (shouldClose) {
      setMobileSidePanelOpen(false);
    }
  }, [mobilePanelDragX]);

  const containerClassName = isStatementsPage
    ? 'flex min-h-[calc(100vh-var(--global-nav-height,0px))] h-[calc(100vh-var(--global-nav-height,0px))] overflow-hidden'
    : 'flex min-h-[calc(100vh-var(--global-nav-height,0px))]';

  const sidePanelWrapperClassName = isStatementsPage
    ? 'hidden lg:flex shrink-0 h-full'
    : 'hidden lg:flex shrink-0';

  const contentClassName = isStatementsPage ? 'flex-1 h-full overflow-hidden' : 'flex-1';

  const mobileFooterContent = React.useMemo(() => {
    const content = config?.footer?.content;
    if (!content) {
      return null;
    }

    if (!React.isValidElement(content)) {
      return content;
    }

    if (typeof content.type === 'string') {
      return content;
    }

    return React.cloneElement(content as React.ReactElement<ClonableProps>, {
      placement: 'floating',
    });
  }, [config]);

  const mobileDialogConfig = React.useMemo(() => {
    if (!config) {
      return null;
    }

    return {
      ...config,
      footer: undefined,
    };
  }, [config]);

  return (
    <div className={containerClassName}>
      {config ? (
        <>
          <div className={sidePanelWrapperClassName}>
            <SidePanel
              config={config}
              showCollapseToggle={false}
              className={isStatementsPage ? 'h-full' : undefined}
            />
          </div>

          {!globalMobileMenuOpen ? (
            <button
              type="button"
              data-testid="mobile-side-panel-open"
              className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[65] inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:hidden"
              onClick={() => setMobileSidePanelOpen(true)}
              aria-label="Open side panel"
            >
              <PanelLeftOpen size={16} />
              <span>Sections</span>
            </button>
          ) : null}
        </>
      ) : null}
      <div className={contentClassName}>{children}</div>

      {mobileDialogConfig && mobileSidePanelMounted ? (
        <div
          className={`fixed inset-0 z-[80] lg:hidden ${mobileSidePanelVisible ? '' : 'pointer-events-none'}`}
          data-testid="mobile-side-panel-dialog"
        >
          <button
            type="button"
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
              mobileSidePanelVisible ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Close side panel"
            onClick={() => setMobileSidePanelOpen(false)}
          />

          <dialog
            className={`absolute inset-y-0 left-0 m-0 h-screen w-[88vw] max-w-sm border-r border-border bg-card p-0 text-card-foreground shadow-2xl transform-gpu will-change-transform ${
              mobilePanelDragX !== 0
                ? 'transition-none'
                : 'transition-transform duration-300 ease-out'
            } ${mobileSidePanelVisible ? 'translate-x-0' : '-translate-x-full'}`}
            open
            aria-modal="true"
            style={
              mobilePanelDragX !== 0
                ? {
                    transform: `translateX(${mobilePanelDragX}px)`,
                  }
                : undefined
            }
            onCancel={event => {
              event.preventDefault();
              setMobileSidePanelOpen(false);
            }}
            onTouchStart={handlePanelTouchStart}
            onTouchMove={handlePanelTouchMove}
            onTouchEnd={handlePanelTouchEnd}
            onTouchCancel={handlePanelTouchEnd}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  {mobileDialogConfig.header?.title ?? 'Sections'}
                </p>
                <button
                  type="button"
                  onClick={() => setMobileSidePanelOpen(false)}
                  className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close side panel"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="h-[calc(100vh-57px)] overflow-hidden">
                <SidePanel
                  config={mobileDialogConfig}
                  width={320}
                  showCollapseToggle={false}
                  className="h-full border-0 shadow-none"
                />
              </div>
            </div>
          </dialog>
        </div>
      ) : null}

      {mobileFooterContent && !mobileSidePanelOpen && !globalMobileMenuOpen ? (
        <div
          className="fixed bottom-0 left-0 z-[72] pointer-events-none lg:hidden"
          data-testid="mobile-side-panel-floating-footer"
        >
          <div className="pointer-events-auto">{mobileFooterContent}</div>
        </div>
      ) : null}
    </div>
  );
}

export function MainSidePanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidePanelProvider
      defaultWidth="md"
      defaultPosition="left"
      defaultCollapsed={false}
      persistState={true}
      storageKey="lumio-side-panel"
    >
      <MainSidePanelLayoutInner>{children}</MainSidePanelLayoutInner>
    </SidePanelProvider>
  );
}
