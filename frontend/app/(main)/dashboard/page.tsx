'use client';

import { Spinner } from '@/app/components/ui/spinner';
import Box from '@mui/material/Box';
import type React from 'react';
import { DashboardContent } from './components/DashboardContent';
import { DashboardPullIndicator } from './components/DashboardPullIndicator';
import { useDashboardPage } from './hooks/useDashboardPage';

const REDIRECTING_SX = {
  display: 'flex',
  minHeight: 'calc(100vh - var(--global-nav-height,0px))',
  alignItems: 'center',
  justifyContent: 'center',
};
const MAIN_SX = {
  minHeight: 'calc(100vh - var(--global-nav-height,0px))',
  display: 'flex',
  flexDirection: 'column',
};

export default function DashboardPage(): React.JSX.Element {
  const {
    isRedirecting,
    isMobile,
    pullHandlers,
    pullDistance,
    pullRefreshing,
    isReadyToRefresh,
    error,
    loading,
    data,
    range,
    activeTab,
    setActiveTab,
    refresh,
    formatAmount,
    statusHeading,
    greetingSubtitle,
    effectivePeriod,
    displayMonth,
    changeMonth,
    headerLabels,
    t,
  } = useDashboardPage();

  if (isRedirecting) {
    return (
      <Box sx={REDIRECTING_SX}>
        <Spinner size={40} />
      </Box>
    );
  }

  return (
    <Box component="main" sx={MAIN_SX} {...pullHandlers}>
      <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <DashboardPullIndicator
          isMobile={isMobile}
          pullDistance={pullDistance}
          pullRefreshing={pullRefreshing}
          isReadyToRefresh={isReadyToRefresh}
          t={t.refresh}
        />
        <DashboardContent
          error={error}
          loading={loading}
          data={data}
          onRefresh={() => {
            void refresh();
          }}
          range={range}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          formatAmount={formatAmount}
          statusHeading={statusHeading}
          greetingSubtitle={greetingSubtitle}
          effectivePeriod={effectivePeriod}
          displayMonth={displayMonth}
          changeMonth={changeMonth}
          exportMenu={t.exportMenu}
          headerLabels={headerLabels}
        />
      </Box>
    </Box>
  );
}
