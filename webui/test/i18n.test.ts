import { afterEach, describe, expect, test } from 'bun:test';
import type * as I18nModule from '../src/lib/i18n';

let importSequence = 0;

const originalLocalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  'localStorage',
);
const originalNavigator = Object.getOwnPropertyDescriptor(
  globalThis,
  'navigator',
);

function restoreGlobalProperty(
  key: 'localStorage' | 'navigator',
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(globalThis, key, descriptor);
  } else {
    Reflect.deleteProperty(globalThis, key);
  }
}

afterEach(() => {
  restoreGlobalProperty('localStorage', originalLocalStorage);
  restoreGlobalProperty('navigator', originalNavigator);
});

class MemoryStorage {
  private readonly values = new Map<string, string>();

  constructor(initialLanguage: string | null) {
    if (initialLanguage) this.values.set('lang', initialLanguage);
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

async function loadI18n(
  browserLanguage: string,
  storedLanguage: string | null,
) {
  const storage = new MemoryStorage(storedLanguage);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { language: browserLanguage },
  });

  const module: typeof I18nModule = await import(
    `../src/lib/i18n/index.ts?test=${importSequence++}`
  );

  return { module, storage };
}

describe('i18n language selection', () => {
  test('prefers a valid stored language over the browser language', async () => {
    const { module: english } = await loadI18n('zh-TW', 'en');
    const { module: chinese } = await loadI18n('en-US', 'zh-CN');

    expect(english.i18n.language).toBe('en');
    expect(chinese.i18n.language).toBe('zh-CN');
  });

  test.each([
    ['zh-CN', 'zh-CN'],
    ['zh-TW', 'zh-CN'],
    ['zh-HK', 'zh-CN'],
    ['en-US', 'en'],
    ['ja-JP', 'en'],
  ])(
    'uses %s browser language when stored language is invalid',
    async (browserLanguage, expectedLanguage) => {
      const { module } = await loadI18n(browserLanguage, 'not-supported');

      expect(module.i18n.language).toBe(expectedLanguage);
    },
  );

  test.each([
    ['zh-TW', '中文消息'],
    ['zh-HK', '中文消息'],
    ['en-US', 'English message'],
    ['ja-JP', 'English message'],
  ])(
    'selects the matching backend message for %s',
    async (language, expectedMessage) => {
      const { module } = await loadI18n('en', null);
      await module.i18n.changeLanguage(language);

      expect(
        module.returnUserLangMsg({
          msg_en: 'English message',
          msg_zh: '中文消息',
        }),
      ).toBe(expectedMessage);
    },
  );

  test('toggles only between supported languages and persists the selection', async () => {
    const { module, storage } = await loadI18n('en-US', null);

    module.changeLocale();
    expect(module.i18n.language).toBe('zh-CN');
    expect(storage.getItem(module.LANG_KEY)).toBe('zh-CN');

    module.changeLocale();
    expect(module.i18n.language).toBe('en');
    expect(storage.getItem(module.LANG_KEY)).toBe('en');
  });
});
