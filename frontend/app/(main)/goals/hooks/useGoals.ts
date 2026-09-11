'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import apiClient from '@/app/lib/api';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';

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
  isPending: boolean;
  isFetching: boolean;
  error: string | null;
  saving: boolean;
  reload: () => void;
  createGoal: (form: GoalFormData) => Promise<boolean>;
  updateGoal: (id: string, form: GoalFormData) => Promise<boolean>;
  deleteGoal: (id: string) => Promise<void>;
  addContribution: (id: string, amount: number, note: string) => Promise<boolean>;
}

export function useGoals(): UseGoalsState {
  // Workspace-scoped: the request itself does not mention the workspace (the
  // server scopes by session), so the key carries it explicitly.
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.goalsList(workspaceId),
    queryFn: ({ signal }) => apiQuery<Goal[]>({ url: '/goals', signal }),
  });

  const mutation = useMutation({
    mutationFn: (request: () => Promise<unknown>) => request(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.goalsList(workspaceId) }),
  });

  const submit = useCallback(
    async (request: () => Promise<unknown>) => {
      return await mutation
        .mutateAsync(request)
        .then(() => true)
        .catch(() => false);
    },
    [mutation.mutateAsync],
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

  const reload = useCallback((): void => {
    void query.refetch();
  }, [query.refetch]);

  return {
    goals: query.data ?? [],
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.isError || mutation.isError ? 'failed' : null,
    saving: mutation.isPending,
    reload,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
  };
}
