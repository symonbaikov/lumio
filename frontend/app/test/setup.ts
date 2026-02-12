import React from 'react';
import { vi } from 'vitest';

vi.mock('next/image', () => ({
  default: (props: { alt?: string; unoptimized?: boolean } & Record<string, unknown>) => {
    const { alt = '', unoptimized, ...rest } = props;
    return React.createElement('img', { alt, ...rest });
  },
}));
