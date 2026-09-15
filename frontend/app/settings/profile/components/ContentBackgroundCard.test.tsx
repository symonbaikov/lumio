// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ContentBackgroundCard } from './ContentBackgroundCard';

vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    quality: _quality,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; quality?: number }) => (
    <img {...props} alt={props.alt} />
  ),
}));

vi.mock('@/app/lib/avatar-url', () => ({
  resolveApiBaseForAssets: () => 'https://api.example.com/api/v1',
}));

const tx = (_path: string[], fallback: string) => fallback;
const PRESET_FILE = 'lightscape-LtnPejWDSAY-unsplash.jpg';

const renderCard = (overrides: Partial<React.ComponentProps<typeof ContentBackgroundCard>> = {}) => {
  const props = {
    tx,
    contentBackground: null,
    dim: 35,
    onPreviewDim: vi.fn(),
    onSaveDim: vi.fn(),
    onSelectPreset: vi.fn(),
    onUpload: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn(),
    ...overrides,
  };
  const view = render(<ContentBackgroundCard {...props} />);
  const fileInput = view.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { props, fileInput };
};

const imageFile = (size: number) => {
  const file = new File(['image'], 'beach.jpg', { type: 'image/jpeg' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('ContentBackgroundCard', () => {
  it('offers the workspace photos and saves the one picked', () => {
    const { props } = renderCard();

    fireEvent.click(screen.getByRole('button', { name: PRESET_FILE }));

    expect(props.onSelectPreset).toHaveBeenCalledWith(PRESET_FILE);
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('lets a saved photo be faded and removed', () => {
    const { props } = renderCard({ contentBackground: `/workspace-backgrounds/${PRESET_FILE}` });

    expect(screen.getByRole('slider')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(props.onRemove).toHaveBeenCalled();
    expect(screen.queryByText('Your image')).toBeNull();
  });

  it('previews an uploaded image from the API', () => {
    renderCard({ contentBackground: '/api/v1/users/backgrounds/0b7c1c0e.jpg' });

    expect(screen.getByText('Your image')).toBeTruthy();
    const preview = document.querySelector(
      'img[src="https://api.example.com/api/v1/users/backgrounds/0b7c1c0e.jpg"]',
    );
    expect(preview).not.toBeNull();
  });

  it('refuses an image over 10 MB without uploading it', () => {
    const { props, fileInput } = renderCard();

    fireEvent.change(fileInput, { target: { files: [imageFile(11 * 1024 * 1024)] } });

    expect(screen.getByText('The image must be 10 MB or smaller.')).toBeTruthy();
    expect(props.onUpload).not.toHaveBeenCalled();
  });

  it('uploads the chosen file and shows why it failed', async () => {
    const onUpload = vi
      .fn()
      .mockRejectedValue(new Error('Only JPEG, PNG, WebP and GIF images are allowed'));
    const { fileInput } = renderCard({ onUpload });
    const file = imageFile(1024);

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(
      await screen.findByText('Only JPEG, PNG, WebP and GIF images are allowed'),
    ).toBeTruthy();
    expect(onUpload).toHaveBeenCalledWith(file);
  });
});
