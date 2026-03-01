'use client';

import LoadingAnimation from '@/app/components/LoadingAnimation';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import {
  Building2,
  ChevronRight,
  Grid,
  List,
  MoreVertical,
  Plus,
  Search,
  SortAsc,
} from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { WorkspaceCard } from './WorkspaceCard';

type ViewMode = 'grid' | 'list';
type SortOption = 'alphabetical' | 'recent' | 'favorites';

type Props = {
  embedded?: boolean;
  redirectPathOnSelect?: string | null;
  onWorkspaceActivated?: () => void;
  onCloseEmbedded?: () => void;
};

export default function WorkspacesListContent({
  embedded,
  redirectPathOnSelect = '/workspaces/overview',
  onWorkspaceActivated,
}: Props) {
  const content: any = useIntlayer('workspaces-selector' as any) as any;
  const { currentWorkspace, workspaces, loading, switchWorkspace, refreshWorkspaces } =
    useWorkspace();
  const router = useRouter();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('favorites');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const handleWorkspaceClick = async (workspaceId: string) => {
    try {
      await switchWorkspace(workspaceId);
      onWorkspaceActivated?.();

      if (redirectPathOnSelect) {
        router.push(redirectPathOnSelect);
      }
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  const handleCreateSuccess = async () => {
    await refreshWorkspaces();
  };

  const filteredAndSortedWorkspaces = useMemo(() => {
    let filtered = workspaces;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = workspaces.filter(workspace => {
        const nameMatch = workspace.name.toLowerCase().includes(query);
        const descriptionMatch = workspace.description?.toLowerCase().includes(query);
        return nameMatch || descriptionMatch;
      });
    }

    return [...filtered].sort((a, b) => {
      if (sortOption === 'favorites') {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
      }

      if (sortOption === 'alphabetical') {
        return a.name.localeCompare(b.name);
      }

      if (sortOption === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return 0;
    });
  }, [workspaces, searchQuery, sortOption]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/5 via-white to-primary/5 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <LoadingAnimation size="xl" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">{content.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-[calc(100vh-var(--global-nav-height,0px))] bg-background dark:bg-background overflow-hidden ${
        embedded ? 'pt-4' : ''
      }`}
    >
      <div className="container max-w-full px-6 py-8">
        {embedded
          ? null
          : workspaces.length > 0 && (
              <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md w-full">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Search workspaces..."
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-card dark:text-foreground"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className={`p-2 rounded-lg transition-colors ${
                        showSortMenu
                          ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } border border-gray-300 dark:border-gray-600`}
                      title="Sort options"
                    >
                      <SortAsc size={20} />
                    </button>
                    {showSortMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10">
                        <button
                          type="button"
                          onClick={() => {
                            setSortOption('favorites');
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            sortOption === 'favorites'
                              ? 'font-semibold text-primary'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          Favorites First
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortOption('alphabetical');
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            sortOption === 'alphabetical'
                              ? 'font-semibold text-primary'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          Alphabetical
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortOption('recent');
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            sortOption === 'recent'
                              ? 'font-semibold text-primary'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          Recently Created
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } border border-gray-300 dark:border-gray-600`}
                    title="Grid view"
                  >
                    <Grid size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list'
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } border border-gray-300 dark:border-gray-600`}
                    title="List view"
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            )}

        {workspaces.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              <Building2 size={48} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {content.noWorkspaces}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first workspace to get started
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
            >
              {content.createWorkspace}
            </button>
          </div>
        ) : filteredAndSortedWorkspaces.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              <Search size={48} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No workspaces found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Try adjusting your search query</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-8">
                {filteredAndSortedWorkspaces.map(workspace => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    onClick={() => handleWorkspaceClick(workspace.id)}
                    onFavoriteToggle={refreshWorkspaces}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-6 hover:border-primary hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center aspect-video"
                >
                  <div className="text-5xl mb-4">
                    <Plus size={36} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                    {content.createWorkspace}
                  </h3>
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8 overflow-hidden rounded-xl border border-border bg-card">
                  <div className="grid grid-cols-[minmax(240px,1.4fr)_minmax(180px,1fr)_minmax(160px,0.8fr)_auto] items-center border-b border-border bg-muted/40 px-6 py-3 text-sm text-muted-foreground">
                    <span>Workspace name</span>
                    <span>Owner</span>
                    <span>Workspace type</span>
                    <span className="sr-only">Actions</span>
                  </div>

                  <div className="divide-y divide-border">
                    {filteredAndSortedWorkspaces.map(workspace => (
                      <button
                        key={workspace.id}
                        type="button"
                        onClick={() => handleWorkspaceClick(workspace.id)}
                        className="grid w-full grid-cols-[minmax(240px,1.4fr)_minmax(180px,1fr)_minmax(160px,0.8fr)_auto] items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="flex min-w-0 items-center">
                          <span className="truncate text-base font-semibold text-foreground">
                            {workspace.name}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">You</p>
                          <p className="truncate text-xs text-muted-foreground">Current member</p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {workspace.memberRole || 'Workspace'}
                          </p>
                          {currentWorkspace?.id === workspace.id && (
                            <span className="mt-1 inline-flex rounded-md border border-emerald-500/70 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                              Default
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 text-muted-foreground">
                          <MoreVertical size={18} />
                          <ChevronRight size={18} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus size={14} />
                    {content.createWorkspace}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
