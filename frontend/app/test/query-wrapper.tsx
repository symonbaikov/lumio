import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderHookResult, renderHook } from '@testing-library/react';
import React from 'react';

/**
 * retry: false обязателен — с боевым предикатом отклонённый мок доходит до
 * isError только через дополнительную попытку, и каждый тест на ошибку
 * становится флейки.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Сигнатура повторяет renderHook позиционно: колбэк, переданный как свойство
 * объекта, сбивает react-hooks/rules-of-hooks — правило смотрит на имя
 * охватывающей функции и не признаёт в нём хук.
 */
export function renderHookWithQuery<TProps, TResult>(
  render: (props: TProps) => TResult,
  options?: { initialProps?: TProps; client?: QueryClient },
): RenderHookResult<TResult, TProps> {
  const client = options?.client ?? createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(render, { wrapper, initialProps: options?.initialProps });
}
