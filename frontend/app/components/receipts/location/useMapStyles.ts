'use client';

import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { apiQuery } from '@/app/lib/query-fn';
import { queryKeys } from '@/app/lib/query-keys';
import type { MapStylesResponse } from './map-style';

const MAP_STYLES_STALE_TIME_MS = 10 * 60 * 1000;

export function useMapStyles(): UseQueryResult<MapStylesResponse> {
  return useQuery({
    queryKey: queryKeys.mapStyles(),
    queryFn: ({ signal }) => apiQuery<MapStylesResponse>({ url: '/maps/styles', signal }),
    staleTime: MAP_STYLES_STALE_TIME_MS,
  });
}
