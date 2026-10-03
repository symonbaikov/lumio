// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageStep } from './LanguageStep';

vi.mock('@mui/material/Autocomplete', () => ({
  default: ({
    renderInput,
    inputId,
  }: { renderInput: (p: { inputProps: { id: string } }) => unknown; inputId?: string }) =>
    renderInput({ inputProps: { id: inputId ?? 'autocomplete' } }),
}));

vi.mock('@mui/material/TextField', () => ({
  default: ({ inputProps }: { inputProps?: { id?: string } }) => <input id={inputProps?.id} />,
}));

vi.mock('react-intlayer', () => ({
  useIntlayer: () => ({
    language: {
      title: 'Language and timezone',
      subtitle: 'Choose language and timezone.',
      localeLabel: 'Language',
      timeZoneLabel: 'Timezone',
      timeZonePlaceholder: 'Select timezone',
      timeZoneHint: 'You can change this later.',
      timeZoneNoOptions: 'No timezones found',
    },
  }),
}));

describe('LanguageStep', () => {
  it('renders timezone autocomplete with onboarding-timezone-select id', () => {
    render(
      <LanguageStep
        locale="en"
        timeZone="Asia/Almaty"
        onLocaleChange={vi.fn()}
        onTimeZoneChange={vi.fn()}
      />,
    );

    expect(document.getElementById('onboarding-timezone-select')).not.toBeNull();
  });
});
