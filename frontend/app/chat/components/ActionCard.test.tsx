import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AgentAction } from '../agent/useAgentChat';
import { ActionCard } from './ActionCard';

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    confirm: 'Подтвердить',
    cancel: 'Отменить',
    working: 'Выполняю…',
    actionDone: 'Готово',
    actionError: 'Не получилось выполнить действие',
    actionCancelled: 'Отменено',
    confirmPrompt: 'Подтвердите действие:',
  }),
}));

function makeAction(overrides: Partial<AgentAction>): AgentAction {
  return {
    toolName: 'create_expense',
    kind: 'write',
    summary: 'Расход 5 000 KZT — Такси (2026-08-16)',
    params: {},
    status: 'pending',
    ...overrides,
  };
}

describe('ActionCard', () => {
  it('pending write shows summary with confirm and cancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ActionCard
        action={makeAction({})}
        reply="Записать расход?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('Расход 5 000 KZT — Такси (2026-08-16)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Подтвердить'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Отменить'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('done state hides the buttons', () => {
    render(
      <ActionCard
        action={makeAction({ status: 'done' })}
        reply=""
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Готово')).toBeInTheDocument();
    expect(screen.queryByText('Подтвердить')).not.toBeInTheDocument();
  });

  it('error state shows the failure message', () => {
    render(
      <ActionCard
        action={makeAction({ status: 'error', errorMessage: 'HTTP 500' })}
        reply=""
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
  });

  it('cancelled state shows the cancelled label', () => {
    render(
      <ActionCard
        action={makeAction({ status: 'cancelled' })}
        reply=""
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Отменено')).toBeInTheDocument();
  });
});
