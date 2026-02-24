// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intlayer', () => ({
  useIntlayer: () => ({
    language: {
      title: 'Language and timezone',
      subtitle: 'Choose language and timezone.',
      localeLabel: 'Language',
      timeZoneLabel: 'Timezone',
      timeZonePlaceholder: 'Select timezone',
      timeZoneHint: 'You can change this later.',
      timeZoneNoOptions: 'No timezones found',
      localeOptions: {
        ru: { value: 'Русский' },
        en: { value: 'English' },
        kk: { value: 'Қазақша' },
      },
    },
  }),
}));

describe('LanguageStep', () => {
  it('renders timezone as react-select instead of native select', async () => {
    const { LanguageStep } = await import('./LanguageStep');

    const html = renderToStaticMarkup(
      <LanguageStep
        locale="en"
        timeZone="Asia/Almaty"
        onLocaleChange={vi.fn()}
        onTimeZoneChange={vi.fn()}
      />,
    );

    expect(html).toContain('onboarding-timezone-select');
    expect(html).not.toContain('id="onboarding-timezone"');
  });
});
