# Workspace Colors & Background Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all hardcoded indigo/purple colors with the Primary color system across workspace pages, and add a background image picker to the Workspace Overview page.

**Architecture:** Reuse existing `BackgroundSelector` component and `updateWorkspaceBackground()` context method. Extract `AVAILABLE_BACKGROUNDS` constant into a shared file. All color changes are CSS class swaps from `indigo-*` to `primary` design tokens.

**Tech Stack:** Next.js 14, React, Tailwind CSS, existing BackgroundSelector component, WorkspaceContext

---

## Task 1: Extract AVAILABLE_BACKGROUNDS to shared constants

**Files:**
- Create: `frontend/app/(main)/workspaces/constants.ts`
- Modify: `frontend/app/(main)/workspaces/components/CreateWorkspaceModal.tsx:21-32`

**Step 1: Create shared constants file**

Create `frontend/app/(main)/workspaces/constants.ts`:

```typescript
export const AVAILABLE_BACKGROUNDS = [
  'ferdinand-stohr-W1FIkdPAB7E-unsplash.jpg',
  'johny-goerend-McSOHojERSI-unsplash.jpg',
  'lightscape-LtnPejWDSAY-unsplash.jpg',
  'michael-fousert-0962p7mcux4-unsplash.jpg',
  'michael-fousert-lE5-z4nTCTQ-unsplash.jpg',
  'mikita-karasiou--67uQbVmZ-A-unsplash.jpg',
  'pascal-debrunner-LKOuYT5_dyw-unsplash.jpg',
  'valdemaras-d-khbjgGAerPU-unsplash.jpg',
  'vidar-nordli-mathisen-641pLhGEEyg-unsplash.jpg',
  'vidar-nordli-mathisen-Oeatf3IQp7w-unsplash.jpg',
];

export const DEFAULT_BACKGROUND = 'vidar-nordli-mathisen-641pLhGEEyg-unsplash.jpg';
```

**Step 2: Update CreateWorkspaceModal to import from constants**

In `frontend/app/(main)/workspaces/components/CreateWorkspaceModal.tsx`:
- Add import: `import { AVAILABLE_BACKGROUNDS } from '../constants';`
- Remove the local `AVAILABLE_BACKGROUNDS` constant (lines 21-32)

**Step 3: Verify build**

Run: `cd frontend && npx next build --no-lint` (or just check for TS errors)

---

## Task 2: Replace indigo colors in WorkspacesListContent.tsx

**File:** `frontend/app/(main)/workspaces/components/WorkspacesListContent.tsx`

10 replacements needed:

### Line 92 - Loading gradient
```
Old: from-indigo-50 via-white to-purple-50
New: from-primary/5 via-white to-primary/5
```

### Line 127 - Sort button active state
```
Old: bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400
New: bg-primary/10 dark:bg-primary/20 text-primary
```

### Lines 144, 158, 172 - Sort menu active text (3 occurrences)
```
Old: font-semibold text-indigo-600 dark:text-indigo-400
New: font-semibold text-primary
```

### Line 187 - Grid view button active
```
Old: bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400
New: bg-primary/10 dark:bg-primary/20 text-primary
```

### Line 199 - List view button active
```
Old: bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400
New: bg-primary/10 dark:bg-primary/20 text-primary
```

### Line 222 - "Create workspace" button (empty state)
```
Old: bg-indigo-600 hover:bg-indigo-700
New: bg-primary hover:bg-primary-hover
```

### Line 250 - "Create" dashed card hover
```
Old: hover:border-indigo-500 dark:hover:border-indigo-400
New: hover:border-primary
```

### Line 314 - "Create workspace" button (list view)
```
Old: bg-indigo-600 hover:bg-indigo-700
New: bg-primary hover:bg-primary-hover
```

---

## Task 3: Replace indigo colors in BackgroundSelector.tsx

**File:** `frontend/app/(main)/workspaces/components/BackgroundSelector.tsx`

### Line 26 - Selected border
```
Old: border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800
New: border-primary ring-2 ring-primary/20 dark:ring-primary/30
```

### Line 27 - Hover border
```
Old: border-gray-300 dark:border-gray-600 hover:border-indigo-300
New: border-gray-300 dark:border-gray-600 hover:border-primary/60
```

### Line 36 - Selected overlay
```
Old: bg-indigo-500 bg-opacity-30
New: bg-primary bg-opacity-30
```

### Line 38 - Checkmark color
```
Old: text-indigo-600 dark:text-indigo-400
New: text-primary
```

---

## Task 4: Replace indigo in CurrencySelector.tsx

**File:** `frontend/app/(main)/workspaces/components/CurrencySelector.tsx`

### Line 30
```
Old: focus:ring-indigo-500
New: focus:ring-primary
```

---

## Task 5: Replace indigo in ServiceIntegrationSuggestions.tsx

**File:** `frontend/app/(main)/workspaces/components/ServiceIntegrationSuggestions.tsx`

### Line 83 - Connect button
```
Old: text-indigo-600 dark:text-indigo-400 border border-indigo-600 dark:border-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20
New: text-primary border border-primary rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10
```

---

## Task 6: Replace indigo in WorkspaceMembersView.tsx

**File:** `frontend/app/(main)/workspaces/components/WorkspaceMembersView.tsx`

### Line 61 - Owner role style
```
Old: owner: 'bg-indigo-50 text-indigo-700 border-indigo-200',
New: owner: 'bg-primary/10 text-primary border-primary/20',
```

---

## Task 7: Add Background Image Picker to WorkspaceOverviewView.tsx

**File:** `frontend/app/(main)/workspaces/components/WorkspaceOverviewView.tsx`

### Step 1: Update imports

Add to existing imports:
```typescript
import { ImageIcon, ChevronDown } from 'lucide-react';
import { BackgroundSelector } from './BackgroundSelector';
import { AVAILABLE_BACKGROUNDS } from '../constants';
```

Update the useWorkspace destructure to include `updateWorkspaceBackground`:
```typescript
const { currentWorkspace, refreshWorkspaces, clearWorkspace, updateWorkspaceBackground } = useWorkspace();
```

### Step 2: Add state

After the existing state declarations (after line 28), add:
```typescript
const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
const [savingBackground, setSavingBackground] = useState(false);
```

### Step 3: Add handler

After the `handleDelete` function (after line 92), add:
```typescript
const handleBackgroundChange = async (background: string) => {
  if (!currentWorkspace) return;
  setSavingBackground(true);
  try {
    await updateWorkspaceBackground(currentWorkspace.id, background);
    toast.success('Background updated');
    setShowBackgroundPicker(false);
  } catch {
    toast.error('Failed to update background');
  } finally {
    setSavingBackground(false);
  }
};
```

### Step 4: Add UI section

Insert a new card between the header card (line 113 `</div>`) and the form card (line 115). The new section:

```tsx
{/* Background Image Picker */}
<div className="rounded-2xl border border-border bg-card p-6 space-y-4">
  <div className="flex items-center justify-between">
    <div className="space-y-1">
      <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
        <ImageIcon size={16} className="text-muted-foreground" />
        Workspace background
      </h2>
      <p className="text-xs text-muted-foreground">
        Choose a background image for your workspace card
      </p>
    </div>
    <button
      type="button"
      onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
      disabled={savingBackground}
      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60"
    >
      Change
      <ChevronDown
        size={14}
        className={`transition-transform ${showBackgroundPicker ? 'rotate-180' : ''}`}
      />
    </button>
  </div>

  {/* Current background preview */}
  <div className="relative aspect-video max-w-xs rounded-lg overflow-hidden border border-border">
    {currentWorkspace.backgroundImage ? (
      <img
        src={`/workspace-backgrounds/${currentWorkspace.backgroundImage}`}
        alt="Current workspace background"
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No background selected</p>
      </div>
    )}
  </div>

  {/* Background selector grid */}
  {showBackgroundPicker && (
    <div className="pt-2">
      {savingBackground && (
        <p className="text-xs text-muted-foreground mb-2">Saving...</p>
      )}
      <BackgroundSelector
        selectedBackground={currentWorkspace.backgroundImage}
        onSelect={handleBackgroundChange}
        backgrounds={AVAILABLE_BACKGROUNDS}
      />
    </div>
  )}
</div>
```

---

## Task 8: Lint and verify

Run:
```bash
make lint
make format
```

Verify:
1. All Workspaces page uses blue (#0a66c2) instead of indigo/purple
2. Overview page shows background image picker
3. Background change saves correctly and persists after reload
4. BackgroundSelector shows checkmark on the currently selected image
