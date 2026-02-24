import { describe, expect, it } from 'vitest';
import { resolveOnboardingText } from './resolveOnboardingText';

describe('resolveOnboardingText', () => {
  it('reads localized value from token.value map with region locale', () => {
    const token = { value: { ru: 'Старт', en: 'Start' } };

    expect(resolveOnboardingText(token, 'Welcome', 'ru-RU')).toBe('Старт');
  });

  it('reads localized value from direct token map', () => {
    const token = { ru: 'Пропустить', en: 'Skip' };

    expect(resolveOnboardingText(token, 'Skip', 'ru')).toBe('Пропустить');
  });

  it('prefers token stringification when available', () => {
    const token = {
      value: 'Start',
      toString() {
        return 'Старт';
      },
    };

    expect(resolveOnboardingText(token, 'Welcome', 'ru')).toBe('Старт');
  });
});
