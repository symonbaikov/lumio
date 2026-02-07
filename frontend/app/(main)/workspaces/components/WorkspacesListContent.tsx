'use client';

import { Grid, List, Search, SortAsc, X } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
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
  embedded = false,
  redirectPathOnSelect = '/workspaces/overview',
  onWorkspaceActivated,
  onCloseEmbedded,
}: Props) {
  const content: any = useIntlayer('workspaces-selector' as any) as any;
  const { workspaces, loading, switchWorkspace, refreshWorkspaces } = useWorkspace();
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
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <LoadingAnimation size="xl" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">{content.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] bg-background dark:bg-background overflow-hidden">
      <div className="container max-w-full px-6 py-8">
        {embedded && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">All Workspaces</h2>
              <p className="text-sm text-muted-foreground">
                Switch workspace without leaving this page
              </p>
            </div>
            {onCloseEmbedded && (
              <button
                type="button"
                onClick={onCloseEmbedded}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <X size={16} />
                Close
              </button>
            )}
          </div>
        )}

        {workspaces.length > 0 && (
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
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
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
                          ? 'font-semibold text-indigo-600 dark:text-indigo-400'
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
                          ? 'font-semibold text-indigo-600 dark:text-indigo-400'
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
                          ? 'font-semibold text-indigo-600 dark:text-indigo-400'
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
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
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
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
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
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {content.noWorkspaces}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first workspace to get started
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              {content.createWorkspace}
            </button>
          </div>
        ) : filteredAndSortedWorkspaces.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No workspaces found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Try adjusting your search query</p>
          </div>
        ) : (
          <>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-8'
                  : 'space-y-4 mb-8'
              }
            >
              {filteredAndSortedWorkspaces.map(workspace => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onClick={() => handleWorkspaceClick(workspace.id)}
                  onFavoriteToggle={refreshWorkspaces}
                />
              ))}

              {viewMode === 'grid' && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-6 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center aspect-video"
                >
                  <div className="text-5xl mb-4">➕</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                    {content.createWorkspace}
                  </h3>
                </button>
              )}
            </div>

            {viewMode === 'list' && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>➕</span>
                  {content.createWorkspace}
                </button>
              </div>
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
