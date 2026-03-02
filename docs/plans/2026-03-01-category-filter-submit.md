# Top Categories Submit Filter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a user clicks a Top Categories item, navigate to the Submit tab with that category filter applied and visible in the UI.

**Architecture:** Update the Top Categories list click handler to route to the Submit tab with a `categoryId` URL param instead of the existing `/top-categories/[id]` route. In the Submit tab, read the `categoryId` param, apply it to the filter state, show a banner indicating the active category filter, and add a sidebar marker to reflect the filter state. Keep routing and filter state derived from URL to ensure deep links work and preserve state across refreshes.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Vitest

---

### Task 1: Top Categories click routes to Submit with categoryId

**Files:**
- Modify: `frontend/app/(main)/statements/components/CategoriesListView.tsx`
- Test: `frontend/app/(main)/statements/components/CategoriesListView.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CategoriesListView } from "./CategoriesListView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockCategories = [
  { id: "cat_food", name: "Food" },
  { id: "cat_travel", name: "Travel" },
];

describe("CategoriesListView", () => {
  it("routes to Submit tab with categoryId on click", async () => {
    const user = userEvent.setup();
    render(<CategoriesListView categories={mockCategories} />);

    await user.click(screen.getByRole("button", { name: "Food" }));

    const { useRouter } = await import("next/navigation");
    const router = useRouter();
    expect(router.push).toHaveBeenCalledWith(
      "/statements?tab=submit&categoryId=cat_food"
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- CategoriesListView.test.tsx`

Expected: FAIL with route still pointing to `/top-categories/[id]` or `router.push` not called with submit URL.

**Step 3: Write minimal implementation**

```tsx
// inside CategoriesListView item click handler
router.push(`/statements?tab=submit&categoryId=${category.id}`);
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- CategoriesListView.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/CategoriesListView.tsx frontend/app/(main)/statements/components/CategoriesListView.test.tsx
git commit -m "feat(statements): route categories to submit tab"
```

### Task 2: Apply categoryId param to Submit filter state

**Files:**
- Modify: `frontend/app/(main)/statements/components/SubmitTransactionsTab.tsx`
- Test: `frontend/app/(main)/statements/components/SubmitTransactionsTab.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { SubmitTransactionsTab } from "./SubmitTransactionsTab";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("categoryId=cat_food"),
}));

describe("SubmitTransactionsTab", () => {
  it("hydrates category filter from URL param", () => {
    render(<SubmitTransactionsTab />);
    expect(
      screen.getByText("Filter: Food")
    ).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- SubmitTransactionsTab.test.tsx`

Expected: FAIL because the filter banner is missing or the filter state ignores URL params.

**Step 3: Write minimal implementation**

```tsx
import { useSearchParams } from "next/navigation";

const searchParams = useSearchParams();
const categoryId = searchParams.get("categoryId");

useEffect(() => {
  if (categoryId) {
    setFilters((prev) => ({ ...prev, categoryId }));
  }
}, [categoryId]);
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- SubmitTransactionsTab.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/SubmitTransactionsTab.tsx frontend/app/(main)/statements/components/SubmitTransactionsTab.test.tsx
git commit -m "feat(statements): hydrate submit filters from url"
```

### Task 3: Submit filter banner for categoryId

**Files:**
- Modify: `frontend/app/(main)/statements/components/SubmitTransactionsTab.tsx`
- Modify: `frontend/app/(main)/statements/components/SubmitFiltersBanner.tsx`
- Test: `frontend/app/(main)/statements/components/SubmitFiltersBanner.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { SubmitFiltersBanner } from "./SubmitFiltersBanner";

describe("SubmitFiltersBanner", () => {
  it("renders category filter chip", () => {
    render(
      <SubmitFiltersBanner
        category={{ id: "cat_food", name: "Food" }}
        onClearCategory={() => {}}
      />
    );

    expect(screen.getByText("Category: Food")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- SubmitFiltersBanner.test.tsx`

Expected: FAIL because category chip is not rendered.

**Step 3: Write minimal implementation**

```tsx
// SubmitFiltersBanner.tsx
type SubmitFiltersBannerProps = {
  category?: { id: string; name: string } | null;
  onClearCategory: () => void;
};

{category ? (
  <button type="button" onClick={onClearCategory}>
    Category: {category.name}
  </button>
) : null}
```

```tsx
// SubmitTransactionsTab.tsx
<SubmitFiltersBanner
  category={selectedCategory}
  onClearCategory={() => setFilters((prev) => ({ ...prev, categoryId: null }))}
/>
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- SubmitFiltersBanner.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/SubmitTransactionsTab.tsx frontend/app/(main)/statements/components/SubmitFiltersBanner.tsx frontend/app/(main)/statements/components/SubmitFiltersBanner.test.tsx
git commit -m "feat(statements): show submit category filter banner"
```

### Task 4: Sidebar marker for active category filter

**Files:**
- Modify: `frontend/app/(main)/statements/components/SubmitSidebar.tsx`
- Test: `frontend/app/(main)/statements/components/SubmitSidebar.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { SubmitSidebar } from "./SubmitSidebar";

describe("SubmitSidebar", () => {
  it("shows a marker when category filter active", () => {
    render(<SubmitSidebar activeCategoryId="cat_food" />);

    expect(screen.getByText("Category filter active")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- SubmitSidebar.test.tsx`

Expected: FAIL because marker UI does not exist.

**Step 3: Write minimal implementation**

```tsx
type SubmitSidebarProps = {
  activeCategoryId?: string | null;
};

{activeCategoryId ? (
  <span aria-label="Category filter active">Category filter active</span>
) : null}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- SubmitSidebar.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/SubmitSidebar.tsx frontend/app/(main)/statements/components/SubmitSidebar.test.tsx
git commit -m "feat(statements): add sidebar marker for category filter"
```

### Task 5: Integrate categoryId URL param with filter banner + sidebar

**Files:**
- Modify: `frontend/app/(main)/statements/components/SubmitTransactionsTab.tsx`
- Modify: `frontend/app/(main)/statements/components/SubmitSidebar.tsx`
- Test: `frontend/app/(main)/statements/components/SubmitTransactionsTab.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { SubmitTransactionsTab } from "./SubmitTransactionsTab";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("categoryId=cat_travel"),
}));

describe("SubmitTransactionsTab", () => {
  it("shows banner and sidebar marker when categoryId present", () => {
    render(<SubmitTransactionsTab />);

    expect(screen.getByText("Category: Travel")).toBeInTheDocument();
    expect(screen.getByLabelText("Category filter active")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- SubmitTransactionsTab.test.tsx`

Expected: FAIL because the banner or marker does not render from URL state.

**Step 3: Write minimal implementation**

```tsx
const selectedCategory = categoryId
  ? categories.find((category) => category.id === categoryId)
  : null;

<SubmitSidebar activeCategoryId={categoryId} />
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- SubmitTransactionsTab.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/SubmitTransactionsTab.tsx frontend/app/(main)/statements/components/SubmitSidebar.tsx frontend/app/(main)/statements/components/SubmitTransactionsTab.test.tsx
git commit -m "feat(statements): wire submit category filter ui"
```

### Task 6: Replace Top Categories navigation behavior (no /top-categories/[id])

**Files:**
- Modify: `frontend/app/(main)/statements/components/CategoriesListView.tsx`
- Modify: `frontend/app/(main)/statements/components/CategoriesListView.test.tsx`

**Step 1: Write the failing test**

```tsx
it("does not route to top categories detail page", async () => {
  const user = userEvent.setup();
  render(<CategoriesListView categories={mockCategories} />);

  await user.click(screen.getByRole("button", { name: "Food" }));

  const { useRouter } = await import("next/navigation");
  const router = useRouter();
  expect(router.push).not.toHaveBeenCalledWith("/top-categories/cat_food");
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- CategoriesListView.test.tsx`

Expected: FAIL if any legacy `/top-categories/[id]` routing is still used.

**Step 3: Write minimal implementation**

```tsx
// Remove any `/top-categories/${category.id}` routing.
// Keep only the submit tab URL with categoryId param.
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- CategoriesListView.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/CategoriesListView.tsx frontend/app/(main)/statements/components/CategoriesListView.test.tsx
git commit -m "fix(statements): remove top categories detail navigation"
```

---

**Tests to run (frontend):**
- `cd frontend && npm run test -- CategoriesListView.test.tsx`
- `cd frontend && npm run test -- SubmitTransactionsTab.test.tsx`
- `cd frontend && npm run test -- SubmitFiltersBanner.test.tsx`
- `cd frontend && npm run test -- SubmitSidebar.test.tsx`

**Expected output:**
- All targeted tests PASS
- No regressions in frontend vitest suite
