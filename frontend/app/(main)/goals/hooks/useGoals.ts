'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useState } from 'react';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currency: string;
  targetDate: string | null;
  currentAmount: number;
  remaining: number;
  percent: number;
  isReached: boolean;
}

export interface GoalFormData {
  name: string;
  targetAmount: number;
  targetDate: string;
}

export const EMPTY_GOAL_FORM: GoalFormData = {
  name: '',
  targetAmount: 0,
  targetDate: '',
};

interface UseGoalsState {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  reload: () => void;
  createGoal: (form: GoalFormData) => Promise<boolean>;
  updateGoal: (id: string, form: GoalFormData) => Promise<boolean>;
  deleteGoal: (id: string) => Promise<void>;
  addContribution: (id: string, amount: number, note: string) => Promise<boolean>;
}

export function useGoals(): UseGoalsState {
  const { currentWorkspace } = useWorkspace();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/goals');
      setGoals(response.data?.data ?? response.data ?? []);
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
    // Goals are workspace-scoped, so switching workspaces must refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async (request: () => Promise<unknown>) => {
      setSaving(true);
      try {
        await request();
        await load();
        return true;
      } catch {
        setError('failed');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const toPayload = (form: GoalFormData) => ({
    name: form.name.trim(),
    targetAmount: form.targetAmount,
    // An empty date field means "no deadline", not an empty string.
    targetDate: form.targetDate === '' ? undefined : form.targetDate,
  });

  const createGoal = useCallback(
    (form: GoalFormData) => submit(() => apiClient.post('/goals', toPayload(form))),
    [submit],
  );

  const updateGoal = useCallback(
    (id: string, form: GoalFormData) =>
      submit(() => apiClient.put(`/goals/${id}`, toPayload(form))),
    [submit],
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      await submit(() => apiClient.delete(`/goals/${id}`));
    },
    [submit],
  );

  const addContribution = useCallback(
    (id: string, amount: number, note: string) =>
      submit(() =>
        apiClient.post(`/goals/${id}/contributions`, {
          amount,
          note: note.trim() === '' ? undefined : note.trim(),
        }),
      ),
    [submit],
  );

  return {
    goals,
    loading,
    error,
    saving,
    reload: load,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
  };
}
