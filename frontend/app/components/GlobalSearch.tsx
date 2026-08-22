'use client';

import { Search } from '@/app/components/icons';
import apiClient from '@/app/lib/api';
import Box from '@mui/material/Box';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type SearchResultKind = 'transaction' | 'statement' | 'payable' | 'receivable' | 'category';

interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

/** Matches the backend's MIN_QUERY_LENGTH — no point sending shorter needles. */
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

const KIND_LABELS: Record<SearchResultKind, string> = {
  transaction: 'Transaction',
  statement: 'Statement',
  payable: 'Payable',
  receivable: 'Receivable',
  category: 'Category',
};

export function GlobalSearch() {
  const router = useRouter();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setOpen(false);
      return;
    }

    // Ignores responses that arrive after a newer keystroke has been sent.
    let active = true;
    const timer = setTimeout(() => {
      apiClient
        .get('/search', { params: { q: query.trim() } })
        .then(response => {
          if (!active) {
            return;
          }
          const payload = response.data?.data ?? response.data;
          setResults(payload?.results ?? []);
          setOpen(true);
        })
        .catch(() => {
          if (active) {
            setResults([]);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = (result: SearchResult): void => {
    setOpen(false);
    setQuery('');
    router.push(result.href);
  };

  return (
    <Box ref={anchorRef} sx={{ position: 'relative', display: { xs: 'none', md: 'block' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Search size={16} />
        <Box
          component="input"
          value={query}
          placeholder="Search"
          aria-label="Search everything"
          onChange={event => setQuery(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          sx={{
            width: 180,
            border: 'none',
            outline: 'none',
            bgcolor: 'transparent',
            color: 'text.primary',
            fontSize: 14,
          }}
        />
      </Box>

      <Popper open={open && results.length > 0} anchorEl={anchorRef.current} placement="bottom-end">
        <Box
          sx={{
            mt: 1,
            width: 320,
            maxHeight: 380,
            overflowY: 'auto',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: 3,
            py: 0.5,
          }}
        >
          {results.map(result => (
            <Box
              component="button"
              type="button"
              key={`${result.kind}-${result.id}`}
              onMouseDown={() => handleSelect(result)}
              sx={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                px: 1.5,
                py: 1,
                border: 'none',
                bgcolor: 'transparent',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {KIND_LABELS[result.kind]}
              </Typography>
              <Typography variant="body2" noWrap>
                {result.title}
              </Typography>
              {result.subtitle && (
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {result.subtitle}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Popper>
    </Box>
  );
}
