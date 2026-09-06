'use client';

import { fillTemplate } from '@/app/(main)/dashboard/helpers/dashboard-helpers';
import { CheckCircle2, CircleAlert } from '@/app/components/icons';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { useIntlayer } from '@/app/i18n';
import type React from 'react';
import { QuickActionsCard } from './QuickActionsCard';
import { UploadZoneCard } from './UploadZoneCard';
import { buildFinanceOpsLabels } from './finance-ops-labels';
import {
  type FinanceOpsFeature,
  type FinanceOpsFeatureStatus,
  type FinanceOpsModel,
  buildFinanceOpsModel,
} from './finance-ops-model';
import { CardLink, Chip, ChipGroup, DashboardCard, ListRow, SectionHeader } from './ui';

type FinanceOpsTabProps = {
  data: DashboardData;
  formatAmount: (value: number) => string;
};

const STATUS_TONE: Record<FinanceOpsFeatureStatus, 'success' | 'info' | 'danger'> = {
  ready: 'success',
  review: 'info',
  blocked: 'danger',
};

function CockpitCard({ model }: { model: FinanceOpsModel }): React.JSX.Element {
  const t = useIntlayer('financeOpsTab');
  return (
    <DashboardCard title={t.cockpitLabel} subtitle={t.cockpitSubtitle}>
      <div className="lumio-dashboard__stat-value">
        {model.totalPending === 0
          ? t.noPendingWork
          : fillTemplate(t.pendingItemsCount.value, { count: String(model.totalPending) })}
      </div>
      <ChipGroup wrap className="lumio-dashboard__saved-views">
        {model.savedViews.map(view => (
          <Chip key={view.id} href={view.href} count={view.count}>
            {view.label}
          </Chip>
        ))}
      </ChipGroup>
    </DashboardCard>
  );
}

function ChecklistCard({ model }: { model: FinanceOpsModel }): React.JSX.Element {
  const t = useIntlayer('financeOpsTab');
  const done = model.closeChecklist.filter(item => item.done).length;
  return (
    <DashboardCard
      title={t.periodCloseChecklist}
      subtitle={fillTemplate(t.controlsComplete.value, {
        done: String(done),
        total: String(model.closeChecklist.length),
      })}
    >
      <div className="lumio-dashboard__list">
        {model.closeChecklist.map(item => (
          <ListRow
            key={item.id}
            href={item.href}
            leading={
              <span
                className={`lumio-dashboard__action-ico ${
                  item.done
                    ? 'lumio-dashboard__action-ico--success'
                    : 'lumio-dashboard__action-ico--critical'
                }`}
              >
                {item.done ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
              </span>
            }
            primary={item.label}
          />
        ))}
      </div>
    </DashboardCard>
  );
}

function FeatureCard({ feature }: { feature: FinanceOpsFeature }): React.JSX.Element {
  const t = useIntlayer('financeOpsTab');
  const statusLabel = {
    ready: t.statusReady,
    review: t.statusReview,
    blocked: t.statusBlocked,
  }[feature.status];
  return (
    <DashboardCard
      title={feature.title}
      action={
        <Chip size="sm" tone={STATUS_TONE[feature.status]}>
          {statusLabel}
        </Chip>
      }
    >
      <p className="lumio-dashboard__feature-summary">{feature.summary}</p>
      <div className="lumio-dashboard__feature-metric">
        <span className="lumio-dashboard__stat-value">{feature.pendingCount}</span>
        <span className="lumio-dashboard__muted">{t.pendingSuffix}</span>
      </div>
      <p className="lumio-dashboard__card-note">{feature.evidence}</p>
      <div className="lumio-dashboard__feature-footer">
        <CardLink href={feature.href}>{feature.primaryAction}</CardLink>
      </div>
    </DashboardCard>
  );
}

export function FinanceOpsTab({ data, formatAmount }: FinanceOpsTabProps): React.JSX.Element {
  const t = useIntlayer('financeOpsTab');
  const model = buildFinanceOpsModel(data, formatAmount, buildFinanceOpsLabels(t));

  return (
    <div className="lumio-dashboard__tab">
      <div className="lumio-dashboard__grid lumio-dashboard__grid--split">
        <div className="lumio-dashboard__column">
          <CockpitCard model={model} />
          <QuickActionsCard data={data} />
        </div>
        <div className="lumio-dashboard__column">
          <ChecklistCard model={model} />
          <UploadZoneCard />
        </div>
      </div>
      <section>
        <SectionHeader title={t.featuresTitle} />
        <div className="lumio-dashboard__grid lumio-dashboard__grid--cards">
          {model.features.map(feature => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </section>
    </div>
  );
}
