// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithQuery } from '@/app/test/query-wrapper';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
const routerMocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@/app/lib/api', () => ({ default: apiMocks }));
vi.mock('next/navigation', () => ({ useRouter: () => routerMocks }));
vi.mock('@/app/hooks/useWorkspaceId', () => ({ useWorkspaceId: () => 'ws-1' }));

import { GlobalSearch } from './GlobalSearch';

interface Row {
  kind: string;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

const RECENT: Row[] = Array.from({ length: 5 }, (_, index) => ({
  kind: 'statement',
  id: `s-${index}`,
  title: `upload-${index}.pdf`,
  subtitle: null,
  href: `/statements/s-${index}/view`,
}));

const FOUND: Row[] = [
  {
    kind: 'transaction',
    id: 't-1',
    title: 'Landlord',
    subtitle: 'Rent for March',
    href: '/statements/transactions?highlight=t-1',
  },
  { kind: 'category', id: 'c-1', title: 'Rent', subtitle: null, href: '/categories' },
];

/** What the server holds; PUT and DELETE change it the way the real endpoints would. */
let starred: Row[] = [];

function envelope(results: Row[]) {
  return Promise.resolve({ data: { data: { query: '', results } } });
}

function idFrom(url: string): string {
  return url.split('/').pop() ?? '';
}

function callsTo(method: 'get' | 'put' | 'delete', url: string) {
  return apiMocks[method].mock.calls.filter(([calledUrl]) => calledUrl === url);
}

async function openPanel(): Promise<HTMLInputElement> {
  renderWithQuery(<GlobalSearch />);
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  return (await screen.findByLabelText('Search everything')) as HTMLInputElement;
}

/** The row in the visible Search tab; the hidden Favorites tab can hold the same title. */
function rowOf(title: string): HTMLElement {
  const searchPanel = screen.getByRole('tabpanel', { name: 'Search' });
  return within(searchPanel).getByText(title).closest('button')?.parentElement as HTMLElement;
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    starred = [];
    apiMocks.get.mockReset();
    apiMocks.put.mockReset();
    apiMocks.delete.mockReset();
    routerMocks.push.mockReset();
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/search/recent') return envelope(RECENT);
      if (url === '/search/favorites') return envelope(starred);
      return envelope(FOUND);
    });
    apiMocks.put.mockImplementation((url: string) => {
      const row = RECENT.find(item => item.id === idFrom(url));
      if (row && !starred.includes(row)) starred = [row, ...starred];
      return Promise.resolve({ data: null });
    });
    apiMocks.delete.mockImplementation((url: string) => {
      starred = starred.filter(item => item.id !== idFrom(url));
      return Promise.resolve({ data: null });
    });
  });

  it('shows only an icon until clicked, then opens with the caret in the field and recent uploads listed', async () => {
    renderWithQuery(<GlobalSearch />);
    expect(screen.queryByLabelText('Search everything')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    const input = await screen.findByLabelText('Search everything');
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(await screen.findByText('Recent uploads')).toBeTruthy();
    for (const upload of RECENT) {
      expect(screen.getByText(upload.title)).toBeTruthy();
    }
    expect(callsTo('get', '/search/recent')).toHaveLength(1);
    expect(callsTo('get', '/search')).toHaveLength(0);
  });

  it('searches only from two characters and groups the matches by kind', async () => {
    const input = await openPanel();
    await screen.findByText('Recent uploads');

    fireEvent.change(input, { target: { value: 'r' } });
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(callsTo('get', '/search')).toHaveLength(0);
    expect(screen.getByText('Recent uploads')).toBeTruthy();

    fireEvent.change(input, { target: { value: 'rent' } });

    expect(await screen.findByText('Transactions')).toBeTruthy();
    expect(screen.getByText('Categories')).toBeTruthy();
    expect(screen.getByText('Landlord')).toBeTruthy();
    expect(screen.queryByText('Recent uploads')).toBeNull();
    expect(callsTo('get', '/search')).toHaveLength(1);
    expect(callsTo('get', '/search')[0][1]).toMatchObject({ params: { q: 'rent' } });
    // Only statements can be starred.
    expect(within(rowOf('Landlord')).queryByRole('button', { name: /favorites/ })).toBeNull();
  });

  it('navigates to the picked result and closes the panel', async () => {
    await openPanel();

    fireEvent.click(await screen.findByText('upload-2.pdf'));

    expect(routerMocks.push).toHaveBeenCalledWith('/statements/s-2/view');
    await waitFor(() => expect(screen.queryByLabelText('Search everything')).toBeNull());
  });

  it('says the favorites are empty, with an illustration, until something is starred', async () => {
    await openPanel();

    fireEvent.click(screen.getByRole('tab', { name: 'Favorites' }));

    expect(await screen.findByText('No favorites yet')).toBeTruthy();
    expect(document.querySelector('img[src*="empty-states/favorites.svg"]')).not.toBeNull();
  });

  it('stars a statement from the Search tab and lists it under Favorites without leaving the panel', async () => {
    await openPanel();
    await screen.findByText('upload-3.pdf');
    await waitFor(() => expect(callsTo('get', '/search/favorites')).toHaveLength(1));

    fireEvent.click(within(rowOf('upload-3.pdf')).getByRole('button', { name: 'Add to favorites' }));

    expect(
      await within(rowOf('upload-3.pdf')).findByRole('button', { name: 'Remove from favorites' }),
    ).toBeTruthy();
    expect(callsTo('put', '/search/favorites/s-3')).toHaveLength(1);
    expect(routerMocks.push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: 'Favorites' }));
    const favoritesPanel = screen.getByRole('tabpanel', { name: 'Favorites' });
    expect(await within(favoritesPanel).findByText('upload-3.pdf')).toBeTruthy();
    expect(within(favoritesPanel).queryByText('upload-1.pdf')).toBeNull();
  });

  it('unstars from the Favorites tab and falls back to the empty state', async () => {
    starred = [RECENT[1]];
    await openPanel();

    fireEvent.click(screen.getByRole('tab', { name: 'Favorites' }));
    const favoritesPanel = screen.getByRole('tabpanel', { name: 'Favorites' });
    await within(favoritesPanel).findByText('upload-1.pdf');

    fireEvent.click(within(favoritesPanel).getByRole('button', { name: 'Remove from favorites' }));

    expect(await within(favoritesPanel).findByText('No favorites yet')).toBeTruthy();
    expect(callsTo('delete', '/search/favorites/s-1')).toHaveLength(1);
  });
});
