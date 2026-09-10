import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));

import apiClient from '@/app/lib/api';
import { type ConfigField, type ConfigPreset, ProtocolIntegrationPage } from './open-protocol-page';

const FIELDS: ConfigField[] = [
  { name: 'baseUrl', label: 'Base URL' },
  { name: 'model', label: 'Model' },
  { name: 'apiKey', label: 'API key', type: 'password' },
];

const PRESETS: ConfigPreset[] = [
  { label: 'OpenAI', values: { baseUrl: 'https://api.openai.com', model: 'gpt-4.1-mini' } },
];

function renderPage(presets?: ConfigPreset[]) {
  (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { connected: false, status: 'disconnected', settings: {} },
  });
  return render(
    <ProtocolIntegrationPage
      title="AI-compatible endpoint"
      description="Endpoint"
      statusPath="/settings/integrations/ai"
      settingsPath="/settings/integrations/ai"
      settingsMethod="put"
      disconnectPath="/settings/integrations/ai"
      workflow="Fill in the endpoint"
      fields={FIELDS}
      presets={presets}
    />,
  );
}

describe('ProtocolIntegrationPage presets', () => {
  it('fills the endpoint and model from a preset without touching the key', async () => {
    renderPage(PRESETS);
    await waitFor(() => expect(screen.getByLabelText('Base URL')).toHaveValue(''));

    fireEvent.click(screen.getByRole('button', { name: 'OpenAI' }));

    expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.openai.com');
    expect(screen.getByLabelText('Model')).toHaveValue('gpt-4.1-mini');
    expect(screen.getByLabelText('API key')).toHaveValue('');
  });

  it('renders no preset row when none are given', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Base URL')).toHaveValue(''));

    expect(screen.queryByText('Presets')).not.toBeInTheDocument();
  });
});
