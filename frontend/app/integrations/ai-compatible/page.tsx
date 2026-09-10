import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import type React from 'react';
import {
  type ConfigField,
  type ConfigPreset,
  ProtocolIntegrationPage,
} from '../open-protocol-page';

/**
 * Every endpoint here is called as `<base URL>/v1/chat/completions`, except
 * api.anthropic.com which is routed through Anthropic's own protocol. Base URLs
 * carry no path of their own for that reason.
 */
const PRESETS: ConfigPreset[] = [
  { label: 'OpenAI', values: { baseUrl: 'https://api.openai.com', model: 'gpt-4.1-mini' } },
  {
    label: 'Anthropic',
    values: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-5' },
  },
  {
    label: 'OpenRouter',
    values: { baseUrl: 'https://openrouter.ai/api', model: 'openai/gpt-4.1-mini' },
  },
];

const FIELDS: ConfigField[] = [
  { name: 'enabled', label: 'Enabled', type: 'checkbox' },
  { name: 'baseUrl', label: 'Base URL', placeholder: 'https://api.openai.com', required: true },
  { name: 'model', label: 'Model', placeholder: 'gpt-4.1-mini', required: true },
  {
    name: 'apiKey',
    label: 'API key',
    type: 'password',
    placeholder: 'Optional for local backends',
  },
  { name: 'timeoutMs', label: 'Timeout, ms', type: 'number', placeholder: '20000' },
];

function PersonalKeyCard(): React.JSX.Element {
  return (
    <ProtocolIntegrationPage
      embedded
      title="Your own key"
      description="Your personal provider credentials for chat mode. They take precedence over the workspace endpoint above, apply only to your chats in this workspace, and need no admin rights to set."
      statusPath="/settings/integrations/ai/personal"
      settingsPath="/settings/integrations/ai/personal"
      settingsMethod="put"
      disconnectPath="/settings/integrations/ai/personal"
      icon={<SmartToyOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />}
      workflow="Chat mode resolves your key first and falls back to the workspace endpoint when this is empty or switched off. Usage is billed to your own provider account."
      fields={FIELDS}
      presets={PRESETS}
    />
  );
}

export default function AiCompatibleIntegrationPage(): React.JSX.Element {
  return (
    <>
      <ProtocolIntegrationPage
        title="AI-compatible endpoint"
        description="Use a cloud provider such as OpenAI, Anthropic or OpenRouter, or an OpenAI-compatible self-hosted backend. Serves the whole workspace."
        statusPath="/settings/integrations/ai"
        settingsPath="/settings/integrations/ai"
        settingsMethod="put"
        disconnectPath="/settings/integrations/ai"
        icon={<SmartToyOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />}
        workflow="Pick a preset or fill in the endpoint and model, then save to validate a chat completion request. A ChatGPT or Claude subscription does not include API access — create an API key on the provider's platform, which bills per token. Secrets are stored encrypted and are never returned to the browser."
        fields={FIELDS}
        presets={PRESETS}
      />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px 40px' }}>
        <PersonalKeyCard />
      </div>
    </>
  );
}
