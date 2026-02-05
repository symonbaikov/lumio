Title: Main Route Side Panel Layout
Date: 2026-02-05
Status: Approved

## Summary
Create a shared layout for the main navigation routes that renders the side panel once and lets each page register its own config via a hook. The side panel is hidden on mobile and only shown on the primary pages in the navbar.

## Goals
- Render the existing SidePanel on /statements, /receipts, /custom-tables, /workspaces.
- Centralize layout so pages only provide config.
- Keep URLs unchanged.
- Hide the side panel on mobile (lg and below).
- Leave the panel ready for future page-specific sections.

## Non-Goals
- No side panel on nested routes unless they opt-in with a config.
- No redesign of the side panel UI.
- No changes to backend data or APIs.

## Approach
### Route Group
- Create `frontend/app/(main)` and move the four primary route folders into it.
- Add `frontend/app/(main)/layout.tsx` to wrap children with the shared side panel layout.

### Shared Layout Component
- Add a client component, `frontend/app/components/side-panel/MainSidePanelLayout.tsx`.
- Layout structure:
  - `<main>` for page content.
  - `<SidePanel>` rendered only when a config is registered.
  - Side panel hidden on mobile with `hidden lg:block` (or `lg:flex`).

### Config Registration
- Each primary page registers its config via `useSidePanelConfig({ config, autoRegister: true })`.
- Add a minimal config factory `createBasicSidePanelConfig({ pageId, title, subtitle? })`.
- Use this factory in each main page for now.

### Context Cleanup
- Allow `setConfig` to accept `null` in the side panel context.
- In `useSidePanelConfig`, clear config on unmount when `autoRegister` is true.

## Data Flow
1. User navigates to a main page.
2. Page calls `useSidePanelConfig` with its config.
3. Context stores config; layout reads it and renders `SidePanel`.
4. On unmount, config is cleared so non-main pages do not show stale panel content.

## Error Handling
- If `config` is null, the side panel is not rendered.
- If sections are empty, SidePanel shows its built-in empty state.

## Mobile Behavior
- Side panel is hidden on `lg` and below.
- Main content uses full width at all sizes.

## Files to Add or Update
- Add: `frontend/app/(main)/layout.tsx`
- Move: `frontend/app/(main)/statements`, `receipts`, `custom-tables`, `workspaces`
- Add: `frontend/app/components/side-panel/MainSidePanelLayout.tsx`
- Update: `frontend/app/components/side-panel/hooks/useSidePanelConfig.ts` (cleanup)
- Update: `frontend/app/components/side-panel/SidePanelContext.tsx` (nullable config)
- Update: `frontend/app/components/side-panel/configs/index.ts` (basic config factory)
- Update: each main page to register config

## Testing / Verification
- Manual: navigate to each main route and confirm side panel shows.
- Manual: resize to mobile width and confirm side panel is hidden.
- Manual: navigate to a non-main page and confirm no side panel is visible.

## Rollout
- No migration needed; changes are localized to frontend routing and layout.
