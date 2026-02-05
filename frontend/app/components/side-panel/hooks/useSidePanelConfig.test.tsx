// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import React, { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import type { SidePanelPageConfig } from '../types';
import { SidePanelProvider } from '../SidePanelContext';
import { useCurrentSidePanelConfig, useSidePanelConfig } from './useSidePanelConfig';

const config: SidePanelPageConfig = {
  pageId: 'test-page',
  header: { title: 'Test Page' },
  sections: [],
};

const updatedConfig: SidePanelPageConfig = {
  pageId: 'test-page',
  header: { title: 'Updated Page' },
  sections: [],
};

function ConfigObserver({ onChange }: { onChange: (config: SidePanelPageConfig | null) => void }) {
  const current = useCurrentSidePanelConfig();
  useEffect(() => {
    onChange(current);
  }, [current, onChange]);
  return null;
}

function ConfigRegistrar({ config: registrarConfig }: { config: SidePanelPageConfig }) {
  useSidePanelConfig({ config: registrarConfig, autoRegister: true });
  return null;
}

function App({
  showRegistrar,
  onChange,
  registrarConfig,
}: {
  showRegistrar: boolean;
  onChange: (config: SidePanelPageConfig | null) => void;
  registrarConfig?: SidePanelPageConfig;
}) {
  const resolvedConfig = registrarConfig ?? config;
  return (
    <SidePanelProvider>
      {showRegistrar ? <ConfigRegistrar config={resolvedConfig} /> : null}
      <ConfigObserver onChange={onChange} />
    </SidePanelProvider>
  );
}

describe('useSidePanelConfig', () => {
  it('clears context config on unmount', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const seen: Array<SidePanelPageConfig | null> = [];

    await act(async () => {
      root.render(<App showRegistrar onChange={(value) => seen.push(value)} />);
    });

    await act(async () => {
      root.render(<App showRegistrar={false} onChange={(value) => seen.push(value)} />);
    });

    expect(seen.some((value) => value?.pageId === 'test-page')).toBe(true);
    expect(seen[seen.length - 1]).toBe(null);
  });

  it('updates context config when config prop changes', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const seen: Array<SidePanelPageConfig | null> = [];

    await act(async () => {
      root.render(
        <App
          showRegistrar
          registrarConfig={config}
          onChange={(value) => seen.push(value)}
        />
      );
    });

    await act(async () => {
      root.render(
        <App
          showRegistrar
          registrarConfig={updatedConfig}
          onChange={(value) => seen.push(value)}
        />
      );
    });

    expect(seen[seen.length - 1]?.header?.title).toBe('Updated Page');
  });
});
