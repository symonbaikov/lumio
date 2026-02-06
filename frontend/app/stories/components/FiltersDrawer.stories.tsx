import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { FiltersDrawer } from '../../(main)/statements/components/filters/FiltersDrawer';
import {
  DEFAULT_STATEMENT_FILTERS,
  type StatementFilters,
} from '../../(main)/statements/components/filters/statement-filters';
import { Button } from '../../components/ui/button';

const meta: Meta<typeof FiltersDrawer> = {
  title: 'Statements/FiltersDrawer',
  component: FiltersDrawer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const DrawerWrapper = ({
  children,
  buttonText = 'Open filters',
}: {
  children: (props: { isOpen: boolean; onClose: () => void }) => ReactNode;
  buttonText?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>{buttonText}</Button>
      {children({ isOpen, onClose: () => setIsOpen(false) })}
    </div>
  );
};

const FiltersDrawerStory = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [filters, setFilters] = useState<StatementFilters>(DEFAULT_STATEMENT_FILTERS);
  const [screen, setScreen] = useState('root');

  const labels = {
    title: 'Filters',
    viewResults: 'View results',
    saveSearch: 'Save search',
    resetFilters: 'Reset filters',
    general: 'General',
    expenses: 'Expenses',
    reports: 'Reports',
    type: 'Type',
    from: 'From',
    groupBy: 'Group by',
    has: 'Has',
    keywords: 'Keywords',
    limit: 'Limit',
    status: 'Status',
    to: 'To',
    amount: 'Amount',
    approved: 'Approved',
    billable: 'Billable',
    currency: 'Currency',
    date: 'Date',
    exported: 'Exported',
    paid: 'Paid',
    any: 'Any',
    yes: 'Yes',
    no: 'No',
  };

  const typeOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'csv', label: 'CSV' },
    { value: 'xlsx', label: 'Excel' },
  ];

  const statusOptions = [
    { value: 'processing', label: 'Processing' },
    { value: 'parsed', label: 'Parsed' },
    { value: 'error', label: 'Error' },
  ];

  const datePresets = [
    { value: 'thisMonth' as const, label: 'This month' },
    { value: 'lastMonth' as const, label: 'Last month' },
    { value: 'yearToDate' as const, label: 'Year to date' },
  ];

  const dateModes = [
    { value: 'on' as const, label: 'On' },
    { value: 'after' as const, label: 'After' },
    { value: 'before' as const, label: 'Before' },
  ];

  const avatarOptions = [
    {
      id: 'user:1',
      label: 'Symon Baikov',
      description: '@symon',
    },
    {
      id: 'bank:kaspi',
      label: 'Kaspi Bank',
      bankName: 'kaspi',
    },
  ];

  const groupByOptions = [
    { value: 'date', label: 'Date' },
    { value: 'status', label: 'Status' },
    { value: 'type', label: 'Type' },
    { value: 'bank', label: 'Bank' },
  ];

  const hasOptions = [
    { value: 'errors', label: 'Errors' },
    { value: 'transactions', label: 'Transactions' },
    { value: 'currency', label: 'Currency' },
  ];

  const currencyOptions = useMemo(() => ['KZT', 'USD', 'EUR'], []);

  return (
    <FiltersDrawer
      open={isOpen}
      onClose={onClose}
      filters={filters}
      screen={screen}
      onBack={() => setScreen('root')}
      onSelect={setScreen}
      onUpdateFilters={(next) => setFilters((prev) => ({ ...prev, ...next }))}
      onResetAll={() => setFilters(DEFAULT_STATEMENT_FILTERS)}
      onViewResults={onClose}
      typeOptions={typeOptions}
      statusOptions={statusOptions}
      datePresets={datePresets}
      dateModes={dateModes}
      fromOptions={avatarOptions}
      toOptions={avatarOptions}
      groupByOptions={groupByOptions}
      hasOptions={hasOptions}
      currencyOptions={currencyOptions}
      labels={labels}
      activeCount={3}
    />
  );
};

export const Default: Story = {
  render: () => (
    <DrawerWrapper>
      {({ isOpen, onClose }) => <FiltersDrawerStory isOpen={isOpen} onClose={onClose} />}
    </DrawerWrapper>
  ),
};
