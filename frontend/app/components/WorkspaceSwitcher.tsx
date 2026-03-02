'use client';

import {
  ChevronDown,
  ChevronRight,
  Hash,
  Loader2,
  LogOut,
  Plus,
  Settings,
  Tags,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useWorkspace } from '../contexts/WorkspaceContext';
import apiClient from '../lib/api';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
}

/**
 * Utility: compute initials for a workspace name.
 * We prefer showing initials instead of emoji icons everywhere.
 */
const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

export function WorkspaceSwitcher() {
  const { currentWorkspace, switchWorkspace, clearWorkspace } = useWorkspace();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (showCategories) {
        loadCategories();
      }
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showCategories]);

  useEffect(() => {
    if (isOpen && showCategories) {
      loadCategories();
    }
  }, [showCategories, isOpen]);

  const loadCategories = async () => {
    try {
      setIsLoadingCats(true);
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoadingCats(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await apiClient.post('/categories', {
        name: newCatName.trim(),
        type: 'expense',
        color: '#3b82f6',
        icon: 'mdi:tag',
      });
      setNewCatName('');
      setShowAddForm(false);
      loadCategories();
      toast.success('Category created');
    } catch (error) {
      console.error('Failed to create category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/categories/${id}`);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Category deleted');
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleExitWorkspace = () => {
    clearWorkspace();
    setIsOpen(false);
    router.push('/workspaces');
  };

  if (!currentWorkspace) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 -ml-2 pr-3 py-2 transition-opacity hover:opacity-80"
      >
        <div className="flex items-center justify-center w-8 h-8 text-sm font-semibold rounded-md bg-muted/10 text-foreground shrink-0">
          {getInitials(currentWorkspace.name)}
        </div>
        <div className="text-left hidden md:block">
          <div className="text-sm font-medium text-foreground truncate max-w-[150px]">
            {currentWorkspace.name}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-card rounded-xl shadow-lg border border-border z-50 overflow-hidden flex flex-col max-h-[85vh]">
          {/* Workspace Section */}
          <div className="border-b border-gray-100 dark:border-gray-700">
            <div className="w-full flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-6 h-6 text-[11px] font-semibold rounded-md bg-muted/10">
                  {getInitials(currentWorkspace.name)}
                </span>
                {currentWorkspace.name}
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
          </div>

          {/* Categories Section */}
          <div className="border-b border-gray-100 dark:border-gray-700 flex flex-col min-h-0">
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase flex items-center gap-1.5">
                <Tags size={10} />
                Categories
              </div>
              <ChevronRight
                size={14}
                className={`text-gray-400 transition-transform duration-200 ${showCategories ? 'rotate-90' : ''}`}
              />
            </button>

            {showCategories && (
              <div className="px-3 pb-3 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] text-gray-400">Manage tags</div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowAddForm(!showAddForm);
                    }}
                    className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
                  >
                    <Plus
                      size={14}
                      className={`transition-transform duration-200 ${showAddForm ? 'rotate-45' : ''}`}
                    />
                  </button>
                </div>

                {showAddForm && (
                  <form
                    onSubmit={handleCreateCategory}
                    className="mb-3 animate-in fade-in slide-in-from-top-1 duration-200"
                  >
                    <div className="relative">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        placeholder="New category name..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                      />
                      <Hash size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                    </div>
                  </form>
                )}

                <div className="space-y-0.5 overflow-y-auto max-h-60 pr-1 custom-scrollbar">
                  {isLoadingCats ? (
                    <div className="flex justify-center py-4">
                      <Loader2 size={16} className="animate-spin text-gray-300" />
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="text-[11px] text-gray-400 text-center py-4 italic">
                      No categories yet
                    </div>
                  ) : (
                    categories.slice(0, 100).map(category => (
                      <div
                        key={category.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors cursor-default"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: category.color || '#cbd5e1',
                          }}
                        />
                        <div className="flex-1 text-xs text-gray-600 dark:text-gray-400 truncate font-medium">
                          {category.name}
                        </div>
                        <button
                          onClick={e => handleDeleteCategory(category.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings Section */}
          <button
            onClick={() => {
              router.push('/workspaces/overview');
              setIsOpen(false);
            }}
            className="w-full flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700"
          >
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase flex items-center gap-1.5">
              <Settings size={10} />
              Settings
            </div>
          </button>

          {/* Actions */}
          <div className="p-1 pb-2">
            <button
              onClick={handleExitWorkspace}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all rounded-lg mt-0.5"
            >
              <LogOut size={14} />
              Exit Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
