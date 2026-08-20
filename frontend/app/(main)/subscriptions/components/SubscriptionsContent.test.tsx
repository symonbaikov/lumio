import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionsContent } from './SubscriptionsContent';

vi.mock('./SubscriptionFormDrawer', () => ({ SubscriptionFormDrawer: () => null }));
vi.mock('./SubscriptionDetailsDrawer', () => ({ SubscriptionDetailsDrawer: () => null }));

describe('SubscriptionsContent', () => {
  it('shows the management KPIs and a desktop subscription row', () => {
    render(
      <SubscriptionsContent
        subscriptions={[
          {
            id: 'sub-1',
            vendorName: 'Claude',
            vendorRaw: null,
            amount: 100,
            currency: 'USD',
            frequency: 'monthly',
            status: 'active',
            ownerId: null,
            owner: null,
            reviewAt: null,
            reviewStatus: 'current',
            riskStatus: 'price_changed',
            cancellationReason: null,
            realizedAnnualSavings: 0,
            confidence: null,
            nextChargeDate: '2026-08-20',
            lastChargeDate: '2026-07-20',
            categoryId: null,
            category: null,
            detectionMeta: null,
            createdAt: '2026-01-01',
          },
        ]}
        summary={{
          totalMonthlyCost: 100,
          activeCount: 1,
          upcomingCount: 1,
          upcoming30DaysCount: 1,
          priceChangeCount: 1,
          overdueReviewCount: 0,
          realizedAnnualSavings: 0,
        }}
        workspaceCurrency="USD"
        workspaceMembers={[]}
        loading={false}
        error={null}
        statusFilter="all"
        setStatusFilter={vi.fn()}
        dialogOpen={false}
        editingSubscription={null}
        formData={{
          vendorName: '',
          amount: '',
          frequency: 'monthly',
          currency: 'USD',
          categoryId: '',
          nextChargeDate: '',
        }}
        setFormData={vi.fn()}
        saving={false}
        openCreate={vi.fn()}
        openEdit={vi.fn()}
        closeDialog={vi.fn()}
        handleSave={vi.fn()}
        handleDelete={vi.fn()}
        handleConfirm={vi.fn()}
        handleDismiss={vi.fn()}
        assignOwner={vi.fn(async () => undefined)}
        recordDecision={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText('Price changes')).toBeInTheDocument();
    expect(screen.getAllByText('Claude')).not.toHaveLength(0);
  });
});
