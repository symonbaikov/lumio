'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

interface WorkspaceStats {
  integrationCount: number;
  recentActivity: boolean;
  memberCount: number;
  lastAccessedAt: Date | null;
}

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  backgroundImage: string | null;
  currency: string | null;
  isFavorite: boolean;
  settings: Record<string, any> | null;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberRole?: string;
  memberPermissions?: any;
  stats?: WorkspaceStats;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  switchWorkspace: (workspaceId: string) => Promise<void>;
  clearWorkspace: () => void;
  refreshWorkspaces: () => Promise<void>;
  toggleFavorite: (workspaceId: string) => Promise<void>;
  updateWorkspaceBackground: (workspaceId: string, backgroundImage: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/workspaces');
      setWorkspaces(response.data);

      // Get current workspace from localStorage or use the first one
      const storedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      if (storedWorkspaceId) {
        const workspace = response.data.find((w: Workspace) => w.id === storedWorkspaceId);
        if (workspace) {
          setCurrentWorkspace(workspace);
        } else if (response.data.length > 0) {
          setCurrentWorkspace(response.data[0]);
          localStorage.setItem('currentWorkspaceId', response.data[0].id);
        }
      } else if (response.data.length > 0) {
        setCurrentWorkspace(response.data[0]);
        localStorage.setItem('currentWorkspaceId', response.data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch workspaces:', err);
      setError(err?.message || 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        setLoading(true);
        setError(null);
        await api.post(`/workspaces/${workspaceId}/switch`);

        const workspace = workspaces.find((w) => w.id === workspaceId);
        if (workspace) {
          setCurrentWorkspace(workspace);
          localStorage.setItem('currentWorkspaceId', workspaceId);
        } else {
          await refreshWorkspaces();
        }
      } catch (err: any) {
        console.error('Failed to switch workspace:', err);
        setError(err?.message || 'Failed to switch workspace');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [workspaces, refreshWorkspaces],
  );

  const clearWorkspace = useCallback(() => {
    setCurrentWorkspace(null);
    localStorage.removeItem('currentWorkspaceId');
  }, []);

  const toggleFavorite = useCallback(
    async (workspaceId: string) => {
      try {
        const response = await api.patch(`/workspaces/${workspaceId}/favorite`);
        const updatedWorkspaces = workspaces.map((w) =>
          w.id === workspaceId ? { ...w, isFavorite: response.data.isFavorite } : w
        );
        setWorkspaces(updatedWorkspaces);
        if (currentWorkspace?.id === workspaceId) {
          setCurrentWorkspace({ ...currentWorkspace, isFavorite: response.data.isFavorite });
        }
      } catch (err: any) {
        console.error('Failed to toggle favorite:', err);
        throw err;
      }
    },
    [workspaces, currentWorkspace]
  );

  const updateWorkspaceBackground = useCallback(
    async (workspaceId: string, backgroundImage: string) => {
      try {
        await api.patch(`/workspaces/${workspaceId}`, { backgroundImage });
        const updatedWorkspaces = workspaces.map((w) =>
          w.id === workspaceId ? { ...w, backgroundImage } : w
        );
        setWorkspaces(updatedWorkspaces);
        if (currentWorkspace?.id === workspaceId) {
          setCurrentWorkspace({ ...currentWorkspace, backgroundImage });
        }
      } catch (err: any) {
        console.error('Failed to update background:', err);
        throw err;
      }
    },
    [workspaces, currentWorkspace]
  );

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      refreshWorkspaces();
    } else {
      setCurrentWorkspace(null);
      setWorkspaces([]);
      setError(null);
      setLoading(false);
    }
  }, [refreshWorkspaces]);

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    switchWorkspace,
    clearWorkspace,
    refreshWorkspaces,
    toggleFavorite,
    updateWorkspaceBackground,
    loading,
    error,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
