// @vitest-environment jsdom
import { Pencil, ThumbsUp } from '@/app/components/icons';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { SidePanel } from './SidePanel';
import { SidePanelProvider } from './SidePanelContext';
import type { SidePanelPageConfig } from './types';

const config: SidePanelPageConfig = {
  pageId: 'test-side-panel',
  sections: [
    {
      id: 'todo',
      type: 'navigation',
      items: [
        {
          id: 'submit',
          label: 'Submit',
          icon: Pencil,
        },
        {
          id: 'approve',
          label: 'Approve',
          icon: ThumbsUp,
          active: true,
        },
      ],
    },
  ],
};

describe('SidePanel navigation styles', () => {
  it('renders active item icon in primary color without icon or row background fills', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SidePanelProvider>
          <SidePanel config={config} showCollapseToggle={false} />
        </SidePanelProvider>,
      );
    });

    const activeButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Approve'),
    );

    expect(activeButton).toBeTruthy();

    // Компонент перешёл с tailwind-классов на inline-стили: у активного пункта
    // иконка 36×36 в цвете var(--primary), без собственной заливки.
    const activeIconWrapper = activeButton?.querySelector('span') as HTMLSpanElement | null;
    expect(activeIconWrapper).toBeTruthy();
    expect(activeIconWrapper?.style.width).toBe('36px');
    expect(activeIconWrapper?.style.height).toBe('36px');
    expect(activeIconWrapper?.style.color).toBe('var(--primary)');
    expect(activeIconWrapper?.style.backgroundColor).toBe('');
  });

  it('adds left inset to navigation rows to align with header logo axis', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SidePanelProvider>
          <SidePanel config={config} showCollapseToggle={false} />
        </SidePanelProvider>,
      );
    });

    const firstNavButton = container.querySelector('button');

    expect(firstNavButton).toBeTruthy();
    // 16px по горизонтали — прежний px-4, теперь как inline-стиль.
    expect(firstNavButton?.style.padding).toBe('10px 16px');
  });
});
