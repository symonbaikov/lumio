import type { Meta, StoryObj } from '@storybook/react';
import { BalanceReviewAlert } from '../../(main)/statements/[id]/edit/components/BalanceReviewAlert';

const labels = {
  title: 'Balance does not reconcile',
  description:
    'This statement stays out of analytics until you confirm the discrepancy. The usual cause is the parser dropping or misreading rows.',
  expected: 'Expected',
  actual: 'Reported',
  difference: 'Difference',
  confirm: 'Confirm discrepancy',
  confirmFailed: 'Failed to confirm the discrepancy',
};

const meta: Meta<typeof BalanceReviewAlert> = {
  title: 'Statements/BalanceReviewAlert',
  component: BalanceReviewAlert,
  parameters: { layout: 'padded' },
  args: {
    statementId: 'stmt-1',
    status: 'needs_review',
    labels,
    formatNumber: (value?: number | null) =>
      value === null || value === undefined ? '—' : value.toFixed(2),
    onConfirmed: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithBalanceFigures: Story = {
  args: {
    parsingDetails: {
      validation: {
        passed: false,
        balanceCheck: { expectedEnd: 182220.7, actualEnd: 198420.54, difference: 16199.84 },
      },
    },
  },
};

/** Some banks report no balances; the alert must still offer the confirmation. */
export const WithoutBalanceFigures: Story = {
  args: {
    parsingDetails: { validation: { passed: false } },
  },
};

/** Any other status renders nothing at all. */
export const HiddenWhenCompleted: Story = {
  args: {
    status: 'completed',
    parsingDetails: { validation: { passed: true } },
  },
};
