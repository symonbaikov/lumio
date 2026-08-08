'use client';

import { useEffect, useState } from 'react';

export type WebGpuStatus = 'checking' | 'ready' | 'unsupported';

export interface WebGpuBudget {
  status: WebGpuStatus;
  /**
   * Rough VRAM headroom in MB, derived from the adapter's largest allowed buffer.
   * WebGPU deliberately hides real VRAM, so this is an approximation used only to
   * flag models that clearly will not fit — never to hard-block a choice.
   */
  availableVramMB: number | null;
}

interface GpuAdapterLike {
  limits?: { maxBufferSize?: number; maxStorageBufferBindingSize?: number };
}

export function useWebGpuBudget(): WebGpuBudget {
  const [budget, setBudget] = useState<WebGpuBudget>({
    status: 'checking',
    availableVramMB: null,
  });

  useEffect(() => {
    let cancelled = false;

    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (!gpu) {
      setBudget({ status: 'unsupported', availableVramMB: null });
      return;
    }

    gpu
      .requestAdapter()
      .then(adapter => {
        if (cancelled) {
          return;
        }
        if (!adapter) {
          setBudget({ status: 'unsupported', availableVramMB: null });
          return;
        }

        const limits = (adapter as GpuAdapterLike).limits;
        const largestBuffer = Math.max(
          limits?.maxBufferSize ?? 0,
          limits?.maxStorageBufferBindingSize ?? 0,
        );

        setBudget({
          status: 'ready',
          availableVramMB: largestBuffer > 0 ? Math.round(largestBuffer / (1024 * 1024)) : null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setBudget({ status: 'unsupported', availableVramMB: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return budget;
}
