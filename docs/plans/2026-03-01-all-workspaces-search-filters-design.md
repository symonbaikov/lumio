# All Workspaces Search and Filters Design

Date: 2026-03-01

## Overview
Add search and filtering controls to the All Workspaces view using HeroUI components. The feature is client-side only and operates on the existing workspace data from `WorkspaceContext`. The goal is to make it fast to find workspaces by name/description and refine results by favorites, role/type, and creation date sorting while preserving current grid/list layouts and empty states.

## Goals
- Provide a HeroUI-based search input and filter controls in the All Workspaces page.
- Support filters: favorites, role/type, and sorting (favorites first, alphabetical, recent).
- Keep existing grid/list presentation and Create Workspace actions intact.
- Provide a clear way to reset filters to defaults.

## Non-goals
- No API or backend changes.
- No pagination or server-side filtering.
- No changes to workspace creation or switching flows.

## UX Summary
- A compact filter bar appears above the workspace grid/list on the All Workspaces page.
- Controls include: search input, sort dropdown, favorites toggle, role filter, type filter.
- On mobile, controls wrap into two rows with consistent spacing.
- When filters yield no results, show a “No workspaces match current filters” empty state.
- Provide a clear/reset action to restore defaults.

## Components
Primary file:
- `frontend/app/(main)/workspaces/components/WorkspacesListContent.tsx`

HeroUI components:
- `Input` for search
- `Dropdown`/`DropdownMenu`/`DropdownItem` for sort and filters
- `Button` for favorites toggle and clear filters
- Optional `Chip` for showing active filter state

## Data Flow
Inputs:
- `workspaces` from `WorkspaceContext`
- UI state: `searchQuery`, `sortOption`, `favoriteFilter`, `roleFilter`, `typeFilter`

Transform:
1. Normalize search string and workspace fields (name/description).
2. Filter by favorites when enabled.
3. Filter by role and type if selected.
4. Sort results by selected sort option.

Output:
- `filteredAndSortedWorkspaces` used by both grid and list renders.

## Filtering Rules
- Search matches case-insensitive `name` and `description`.
- Favorites filter: show only `isFavorite === true` when enabled.
- Role filter uses `memberRole` when present. If absent, treat as `unknown` and only include when role filter is `all`.
- Type filter defaults to `all`. If no explicit type field exists, use `memberRole` or a fallback label like `Workspace` to keep UX consistent.

## Sorting Rules
- Favorites: favorites first, then alphabetical.
- Alphabetical: `name` ascending.
- Recent: `createdAt` descending; invalid dates sort last.

## Accessibility
- All controls have visible labels or `aria-label`.
- Keyboard navigation supported by HeroUI dropdowns.
- Focus outlines preserved.

## Empty States
- No workspaces at all: keep “Create your first workspace” state.
- Filtered to zero: show “No workspaces match current filters.”

## Testing
Update `frontend/app/(main)/workspaces/components/WorkspacesListContent.test.tsx`:
- Search by name and description.
- Favorites-only filter.
- Role/type filter behavior.
- Sorting behavior for alphabetical/recent/favorites.
- Empty filtered results message.

## Rollout
- Client-side only; no migration or API changes.
- Feature ships with existing All Workspaces page.
