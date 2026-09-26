'use client';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import {
  keepPreviousData,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowLeftRight,
  FileText,
  Search,
  Star,
  StarBorder,
  Tag,
  Wallet,
} from '@/app/components/icons';
import { PanelRow, PanelSearchField, PanelSectionLabel } from '@/app/components/panels/panel-ui';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { sharedMuiTabsSx } from '@/app/components/ui/mui-tabs';
import { useWorkspaceId } from '@/app/hooks/useWorkspaceId';
import apiClient from '@/app/lib/api';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';

type SearchResultKind = 'transaction' | 'statement' | 'payable' | 'receivable' | 'category';

interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
}

type PanelTab = 'search' | 'favorites';

interface Favorites {
  favoritesQuery: UseQueryResult<SearchResponse>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (result: SearchResult) => void;
}

/** Matches the backend's MIN_QUERY_LENGTH — no point sending shorter needles. */
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
/** One placeholder per recent upload the backend can return. */
const SKELETON_KEYS = ['search-0', 'search-1', 'search-2', 'search-3', 'search-4'];

const KIND_LABELS: Record<SearchResultKind, string> = {
  transaction: 'Transactions',
  statement: 'Statements',
  payable: 'Payables',
  receivable: 'Receivables',
  category: 'Categories',
};

const KIND_ICONS: Record<SearchResultKind, React.ReactNode> = {
  transaction: <ArrowLeftRight size={18} />,
  statement: <FileText size={18} />,
  payable: <Wallet size={18} />,
  receivable: <Wallet size={18} />,
  category: <Tag size={18} />,
};

/** Groups keep the backend's order: kinds as they arrive, rows as sorted within a kind. */
function groupByKind(results: SearchResult[]): { kind: SearchResultKind; items: SearchResult[] }[] {
  const groups = new Map<SearchResultKind, SearchResult[]>();
  for (const result of results) {
    groups.set(result.kind, [...(groups.get(result.kind) ?? []), result]);
  }
  return [...groups].map(([kind, items]) => ({ kind, items }));
}

/**
 * Stars are personal and only statements (receipt scans included) carry them.
 * The list doubles as the source of every star shown in the Search tab.
 */
function useFavorites(): Favorites {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.searchFavorites(workspaceId);

  const favoritesQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => apiQuery<SearchResponse>({ url: '/search/favorites', signal }),
  });

  const mutation = useMutation({
    mutationFn: ({ result, favorite }: { result: SearchResult; favorite: boolean }) =>
      favorite
        ? apiClient.put(`/search/favorites/${result.id}`)
        : apiClient.delete(`/search/favorites/${result.id}`),
    onMutate: async ({ result, favorite }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SearchResponse>(queryKey);
      queryClient.setQueryData<SearchResponse>(queryKey, current => {
        const others = (current?.results ?? []).filter(item => item.id !== result.id);
        return { query: '', results: favorite ? [result, ...others] : others };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      toast.error('Could not update favorites. Try again.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const favoriteIds = new Set((favoritesQuery.data?.results ?? []).map(result => result.id));

  return {
    favoritesQuery,
    isFavorite: id => favoriteIds.has(id),
    toggleFavorite: result => mutation.mutate({ result, favorite: !favoriteIds.has(result.id) }),
  };
}

function FavoriteButton({
  favorite,
  onToggle,
}: {
  favorite: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <IconButton
      size="small"
      onClick={onToggle}
      aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={favorite}
      sx={{
        // Sits over the row's reserved trailing slot: a button inside the row button is invalid HTML.
        position: 'absolute',
        top: '50%',
        right: 4,
        transform: 'translateY(-50%)',
        color: favorite ? 'warning.main' : 'text.secondary',
      }}
    >
      {favorite ? <Star size={18} /> : <StarBorder size={18} />}
    </IconButton>
  );
}

function ResultRow({
  result,
  onSelect,
  favorites,
}: {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  favorites: Favorites;
}): React.JSX.Element {
  const starrable = result.kind === 'statement';

  return (
    <Box sx={{ position: 'relative' }}>
      <PanelRow
        icon={KIND_ICONS[result.kind]}
        // File names often have no spaces to wrap on, so they would spill out of the row.
        name={
          <Box
            component="span"
            title={result.title}
            sx={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {result.title}
          </Box>
        }
        description={result.subtitle ?? ''}
        onClick={() => onSelect(result)}
        trailing={
          starrable ? <Box component="span" sx={{ width: 32, flexShrink: 0 }} /> : undefined
        }
      />
      {starrable && (
        <FavoriteButton
          favorite={favorites.isFavorite(result.id)}
          onToggle={() => favorites.toggleFavorite(result)}
        />
      )}
    </Box>
  );
}

function PanelMessage({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Typography sx={{ py: 4, textAlign: 'center', fontSize: 14, color: 'text.secondary' }}>
      {children}
    </Typography>
  );
}

function RowsSkeleton(): React.JSX.Element {
  return (
    <Box>
      {SKELETON_KEYS.map(key => (
        <Skeleton key={key} variant="rounded" height={52} sx={{ mb: 1 }} />
      ))}
    </Box>
  );
}

function SearchTab({
  onSelect,
  favorites,
}: {
  onSelect: (result: SearchResult) => void;
  favorites: Favorites;
}): React.JSX.Element {
  const workspaceId = useWorkspaceId();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const searching = query.length >= MIN_QUERY_LENGTH;

  const recentQuery = useQuery({
    queryKey: queryKeys.searchRecent(workspaceId),
    queryFn: ({ signal }) => apiQuery<SearchResponse>({ url: '/search/recent', signal }),
    enabled: !searching,
    // An upload made a moment ago must show up the next time the panel opens.
    staleTime: 0,
  });

  const searchQuery = useQuery({
    queryKey: queryKeys.search({ workspaceId, q: query }),
    queryFn: ({ signal }) =>
      apiQuery<SearchResponse>({ url: '/search', params: { q: query }, signal }),
    enabled: searching,
    // Typing on must not blank the list between keystrokes.
    placeholderData: keepPreviousData,
  });

  const active = searching ? searchQuery : recentQuery;
  const results = active.data?.results ?? [];
  const renderRow = (result: SearchResult): React.JSX.Element => (
    <ResultRow
      key={`${result.kind}-${result.id}`}
      result={result}
      onSelect={onSelect}
      favorites={favorites}
    />
  );

  let content: React.ReactNode;
  if (active.isPending) {
    content = <RowsSkeleton />;
  } else if (active.isError) {
    content = <PanelMessage>Search is unavailable right now. Try again in a moment.</PanelMessage>;
  } else if (!searching) {
    content =
      results.length > 0 ? (
        <Box>
          <PanelSectionLabel>Recent uploads</PanelSectionLabel>
          {results.map(renderRow)}
        </Box>
      ) : (
        <PanelMessage>No uploads yet.</PanelMessage>
      );
  } else if (results.length === 0) {
    content = <PanelMessage>Nothing matches "{query}".</PanelMessage>;
  } else {
    content = groupByKind(results).map(group => (
      <Box key={group.kind}>
        <PanelSectionLabel>{KIND_LABELS[group.kind]}</PanelSectionLabel>
        {group.items.map(renderRow)}
      </Box>
    ));
  }

  return (
    <>
      <PanelSearchField
        value={input}
        placeholder="Search transactions, statements, categories…"
        ariaLabel="Search everything"
        autoFocus
        onChange={setInput}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
        {content}
      </Box>
    </>
  );
}

function FavoritesTab({
  onSelect,
  favorites,
}: {
  onSelect: (result: SearchResult) => void;
  favorites: Favorites;
}): React.JSX.Element {
  const { favoritesQuery } = favorites;
  const results = favoritesQuery.data?.results ?? [];

  if (favoritesQuery.isPending) {
    return <RowsSkeleton />;
  }
  if (favoritesQuery.isError) {
    return <PanelMessage>Favorites are unavailable right now. Try again in a moment.</PanelMessage>;
  }
  if (results.length === 0) {
    return (
      <EmptyState
        illustration="favorites"
        size="md"
        compact
        title="No favorites yet"
        description="Star a statement or receipt in the Search tab to keep it here."
      />
    );
  }
  return (
    <Box sx={{ flex: 1, overflowY: 'auto' }}>
      {results.map(result => (
        <ResultRow
          key={`${result.kind}-${result.id}`}
          result={result}
          onSelect={onSelect}
          favorites={favorites}
        />
      ))}
    </Box>
  );
}

/**
 * Lives inside the drawer, which unmounts its content on close: every opening
 * starts on the Search tab with an empty field that already has the caret in it.
 */
function SearchPanelBody({
  onSelect,
}: {
  onSelect: (result: SearchResult) => void;
}): React.JSX.Element {
  const [tab, setTab] = useState<PanelTab>('search');
  const favorites = useFavorites();
  // eslint-disable-next-line max-params
  const handleTabChange = (_: React.SyntheticEvent, value: PanelTab): void => setTab(value);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons={false}
        sx={sharedMuiTabsSx}
      >
        <Tab
          value="search"
          label="Search"
          id="global-search-tab-search"
          aria-controls="global-search-panel-search"
        />
        <Tab
          value="favorites"
          label="Favorites"
          id="global-search-tab-favorites"
          aria-controls="global-search-panel-favorites"
        />
      </Tabs>

      {/* Both panels stay mounted, so switching tabs keeps what was typed. The top padding is
          theirs because the theme's -4px focus-ring margin on scrollable tabs cancels the tabs' mb. */}
      <Box
        role="tabpanel"
        id="global-search-panel-search"
        aria-labelledby="global-search-tab-search"
        hidden={tab !== 'search'}
        sx={{
          display: tab === 'search' ? 'flex' : 'none',
          flexDirection: 'column',
          gap: 2,
          flex: 1,
          minHeight: 0,
          pt: 2,
        }}
      >
        <SearchTab onSelect={onSelect} favorites={favorites} />
      </Box>
      <Box
        role="tabpanel"
        id="global-search-panel-favorites"
        aria-labelledby="global-search-tab-favorites"
        hidden={tab !== 'favorites'}
        sx={{
          display: tab === 'favorites' ? 'flex' : 'none',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          pt: 2,
        }}
      >
        <FavoritesTab onSelect={onSelect} favorites={favorites} />
      </Box>
    </Box>
  );
}

export function GlobalSearch(): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSelect = (result: SearchResult): void => {
    setOpen(false);
    router.push(result.href);
  };

  return (
    <>
      {/* The wrapper hides it on mobile: sx on the button itself would race the class's display. */}
      <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
        <button
          type="button"
          className="lumio-topbar__icon-btn"
          title="Search"
          aria-label="Search"
          onClick={() => setOpen(true)}
        >
          <Search size={18} />
        </button>
      </Box>

      <DrawerShell
        isOpen={open}
        onClose={() => setOpen(false)}
        position="right"
        width="md"
        title="Search"
      >
        <SearchPanelBody onSelect={handleSelect} />
      </DrawerShell>
    </>
  );
}
