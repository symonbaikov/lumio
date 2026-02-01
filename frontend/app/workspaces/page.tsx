"use client";

import { useIntlayer } from "next-intlayer";
import { useRouter } from "next/navigation";
import React, { useState, useMemo } from "react";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { CreateWorkspaceModal } from "./components/CreateWorkspaceModal";
import { WorkspaceCard } from "./components/WorkspaceCard";
import { Search, Grid, List, Star, SortAsc } from "lucide-react";
import LoadingAnimation from "../components/LoadingAnimation";

type ViewMode = 'grid' | 'list';
type SortOption = 'alphabetical' | 'recent' | 'favorites';

export default function WorkspacesPage() {
  const content: any = useIntlayer("workspaces-selector" as any) as any;
  const { workspaces, loading, switchWorkspace, refreshWorkspaces } =
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
      router.push("/reports");
    } catch (error) {
      console.error("Failed to switch workspace:", error);
    }
  };

  const handleCreateSuccess = async () => {
    await refreshWorkspaces();
  };

  // Filter and sort workspaces
  const filteredAndSortedWorkspaces = useMemo(() => {
    let filtered = workspaces;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = workspaces.filter((workspace) => {
        const nameMatch = workspace.name.toLowerCase().includes(query);
        const descriptionMatch = workspace.description?.toLowerCase().includes(query);
        return nameMatch || descriptionMatch;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortOption === 'favorites') {
        // Favorites first
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        // Then by name
        return a.name.localeCompare(b.name);
      } else if (sortOption === 'alphabetical') {
        return a.name.localeCompare(b.name);
      } else if (sortOption === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return sorted;
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
      <div className="container max-w-full px-6 py-12">
        {/* Header removed as per request */}

        {/* Search and Filters */}
        {workspaces.length > 0 && (
          <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-card dark:text-foreground"
              />
            </div>

            {/* View Controls */}
            <div className="flex gap-2">
              {/* Sort Button */}
              <div className="relative">
                <button
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
                      onClick={() => {
                        setSortOption('favorites');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        sortOption === 'favorites' ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Favorites First
                    </button>
                    <button
                      onClick={() => {
                        setSortOption('alphabetical');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        sortOption === 'alphabetical' ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Alphabetical
                    </button>
                    <button
                      onClick={() => {
                        setSortOption('recent');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        sortOption === 'recent' ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Recently Created
                    </button>
                  </div>
                )}
              </div>

              {/* View Mode Toggles */}
              <button
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

        {/* Workspaces Grid or List */}
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
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Try adjusting your search query
            </p>
          </div>
        ) : (
          <>
            <div className={
              viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-8"
                : "space-y-4 mb-8"
            }>
              {filteredAndSortedWorkspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onClick={() => handleWorkspaceClick(workspace.id)}
                  onFavoriteToggle={refreshWorkspaces}
                />
              ))}

              {/* Create New Workspace Card (Grid View Only) */}
              {viewMode === 'grid' && (
                <div
                  onClick={() => setIsCreateModalOpen(true)}
                  className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-6 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center aspect-video"
                >
                  <div className="text-5xl mb-4">➕</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                    {content.createWorkspace}
                  </h3>
                </div>
              )}
            </div>

            {/* Create Button for List View */}
            {viewMode === 'list' && (
              <div className="flex justify-center">
                <button
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

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
