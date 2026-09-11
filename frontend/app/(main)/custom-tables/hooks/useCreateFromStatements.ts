'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import type { StatementGroupBy } from '../create-from-statements-utils';
import {
  buildStatementSelectionOptions,
  filterStatementSelectionOptions,
  getSelectedStatementsSummary,
  groupStatementSelectionOptions,
} from '../create-from-statements-utils';

interface StatementItem {
  id: string;
  fileName: string;
  status: string;
  totalTransactions: number;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  createdAt: string;
  bankName?: string | null;
}

interface UseCreateFromStatementsParams {
  loadTables: () => Promise<void>;
  messages: {
    loadStatementsFailed: string;
    selectAtLeastOne: string;
    createdFromStatement: string;
    createFromStatementFailed: string;
  };
}

export function useCreateFromStatements({ loadTables, messages }: UseCreateFromStatementsParams): {
  statements: StatementItem[];
  statementsLoading: boolean;
  creatingFromStatements: boolean;
  createFromStatementsOpen: boolean;
  createFromStatementsStep: 1 | 2;
  createFromStatementsForm: { name: string; description: string };
  selectedStatementIds: string[];
  statementsSearchQuery: string;
  statementsSourceFilter: string;
  statementsGroupBy: StatementGroupBy;
  statementSelectionOptions: ReturnType<typeof buildStatementSelectionOptions>;
  statementSourceOptions: string[];
  filteredStatementSelectionOptions: ReturnType<typeof filterStatementSelectionOptions>;
  groupedStatementSelectionOptions: ReturnType<typeof groupStatementSelectionOptions>;
  selectedStatementSummary: ReturnType<typeof getSelectedStatementsSummary>;
  selectedStatementPayloadIds: string[];
  selectedStatementPreviewItems: ReturnType<typeof buildStatementSelectionOptions>;
  setSelectedStatementIds: React.Dispatch<React.SetStateAction<string[]>>;
  setStatementsSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setStatementsSourceFilter: React.Dispatch<React.SetStateAction<string>>;
  setStatementsGroupBy: React.Dispatch<React.SetStateAction<StatementGroupBy>>;
  setCreateFromStatementsForm: React.Dispatch<
    React.SetStateAction<{ name: string; description: string }>
  >;
  setCreateFromStatementsStep: React.Dispatch<React.SetStateAction<1 | 2>>;
  openCreateFromStatements: () => Promise<void>;
  closeCreateFromStatements: () => void;
  handleCreateFromStatements: () => Promise<void>;
} {
  const router = useRouter();
  const [statements, setStatements] = useState<StatementItem[]>([]);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [creatingFromStatements, setCreatingFromStatements] = useState(false);
  const [createFromStatementsOpen, setCreateFromStatementsOpen] = useState(false);
  const [createFromStatementsStep, setCreateFromStatementsStep] = useState<1 | 2>(1);
  const [createFromStatementsForm, setCreateFromStatementsForm] = useState({
    name: '',
    description: '',
  });
  const [selectedStatementIds, setSelectedStatementIds] = useState<string[]>([]);
  const [statementsSearchQuery, setStatementsSearchQuery] = useState('');
  const [statementsSourceFilter, setStatementsSourceFilter] = useState('all');
  const [statementsGroupBy, setStatementsGroupBy] = useState<StatementGroupBy>('source');

  const loadStatements = useCallback(async (): Promise<void> => {
    setStatementsLoading(true);

    await (async () => {
      const response = await apiClient.get('/statements', { params: { page: 1, limit: 50 } });
      const payload = response.data?.data || response.data?.items || [];
      setStatements(Array.isArray(payload) ? payload : []);
    })()
      .catch(async error => {
        console.error('Failed to load statements:', error);
        toast.error(getApiErrorMessage(error, messages.loadStatementsFailed));
      })
      .finally(async () => {
        setStatementsLoading(false);
      });
  }, [messages.loadStatementsFailed]);

  const statementSelectionOptions = useMemo(
    () => buildStatementSelectionOptions(statements),
    [statements],
  );

  const statementSourceOptions = useMemo(() => {
    const values = Array.from(
      new Set(statementSelectionOptions.map(opt => opt.sourceLabel).filter(Boolean)),
    );
    return ['all', ...values.sort((a, b) => a.localeCompare(b))];
  }, [statementSelectionOptions]);

  const filteredStatementSelectionOptions = useMemo(
    () =>
      filterStatementSelectionOptions(statementSelectionOptions, {
        query: statementsSearchQuery,
        source: statementsSourceFilter,
      }),
    [statementSelectionOptions, statementsSearchQuery, statementsSourceFilter],
  );

  const groupedStatementSelectionOptions = useMemo(
    () => groupStatementSelectionOptions(filteredStatementSelectionOptions, statementsGroupBy),
    [filteredStatementSelectionOptions, statementsGroupBy],
  );

  const selectedStatementSummary = useMemo(
    () => getSelectedStatementsSummary(statementSelectionOptions, selectedStatementIds),
    [statementSelectionOptions, selectedStatementIds],
  );

  const selectedStatementPayloadIds = useMemo(() => {
    const available = new Set(statementSelectionOptions.map(opt => opt.representativeId));
    return selectedStatementIds.filter(id => available.has(id));
  }, [selectedStatementIds, statementSelectionOptions]);

  const selectedStatementPreviewItems = useMemo(() => {
    const selectedSet = new Set(selectedStatementIds);
    return statementSelectionOptions.filter(opt => selectedSet.has(opt.representativeId));
  }, [selectedStatementIds, statementSelectionOptions]);

  useEffect(() => {
    const available = new Set(statementSelectionOptions.map(opt => opt.representativeId));
    setSelectedStatementIds(prev => prev.filter(id => available.has(id)));
  }, [statementSelectionOptions]);

  const resetForm = (): void => {
    setCreateFromStatementsStep(1);
    setSelectedStatementIds([]);
    setCreateFromStatementsForm({ name: '', description: '' });
    setStatementsSearchQuery('');
    setStatementsSourceFilter('all');
    setStatementsGroupBy('source');
  };

  const openCreateFromStatements = useCallback(async (): Promise<void> => {
    setCreateFromStatementsOpen(true);
    resetForm();
    await loadStatements();
  }, [loadStatements]);

  const closeCreateFromStatements = useCallback((): void => {
    setCreateFromStatementsOpen(false);
    resetForm();
  }, []);

  const handleCreateFromStatements = useCallback(async (): Promise<void> => {
    if (!selectedStatementPayloadIds.length) {
      toast.error(messages.selectAtLeastOne);
      return;
    }
    setCreatingFromStatements(true);

    return await (async () => {
      const response = await apiClient.post('/custom-tables/from-statements', {
        statementIds: selectedStatementPayloadIds,
        name: createFromStatementsForm.name.trim() || undefined,
        description: createFromStatementsForm.description.trim() || undefined,
      });
      const data = response.data?.data || response.data;
      const tableId = data?.tableId || data?.id;
      toast.success(messages.createdFromStatement);
      closeCreateFromStatements();
      if (tableId) {
        router.push(`/custom-tables/${tableId}`);
        return;
      }
      await loadTables();
    })()
      .catch(async error => {
        console.error('Failed to create from statements:', error);
        toast.error(getApiErrorMessage(error, messages.createFromStatementFailed));
      })
      .finally(async () => {
        setCreatingFromStatements(false);
      });
  }, [
    selectedStatementPayloadIds,
    createFromStatementsForm,
    closeCreateFromStatements,
    loadTables,
    router,
    messages,
  ]);

  return {
    statements,
    statementsLoading,
    creatingFromStatements,
    createFromStatementsOpen,
    createFromStatementsStep,
    createFromStatementsForm,
    selectedStatementIds,
    statementsSearchQuery,
    statementsSourceFilter,
    statementsGroupBy,
    statementSelectionOptions,
    statementSourceOptions,
    filteredStatementSelectionOptions,
    groupedStatementSelectionOptions,
    selectedStatementSummary,
    selectedStatementPayloadIds,
    selectedStatementPreviewItems,
    setSelectedStatementIds,
    setStatementsSearchQuery,
    setStatementsSourceFilter,
    setStatementsGroupBy,
    setCreateFromStatementsForm,
    setCreateFromStatementsStep,
    openCreateFromStatements,
    closeCreateFromStatements,
    handleCreateFromStatements,
  };
}
