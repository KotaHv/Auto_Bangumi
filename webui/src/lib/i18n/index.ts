import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from './en.json';
import zhCN from './zh-CN.json';

export const messages = {
  en: enUS,
  'zh-CN': zhCN,
};

export type Languages = keyof typeof messages;

export const LANG_KEY = 'lang';

function isSupportedLanguage(value: string | null): value is Languages {
  return value === 'en' || value === 'zh-CN';
}

function classifyLanguage(language: string): Languages {
  const normalized = language.toLowerCase();
  return normalized === 'zh' || normalized.startsWith('zh-') ? 'zh-CN' : 'en';
}

function initialLang(): Languages {
  const stored = localStorage.getItem(LANG_KEY);
  return isSupportedLanguage(stored)
    ? stored
    : classifyLanguage(navigator.language);
}

export const i18n = i18next.createInstance();

i18n.use(initReactI18next).init({
  lng: initialLang(),
  fallbackLng: 'en',
  resources: {
    en: { translation: enUS },
    'zh-CN': { translation: zhCN },
  },
  interpolation: {
    prefix: '{',
    suffix: '}',
    escapeValue: false,
  },
});

export function changeLocale() {
  const lang = classifyLanguage(i18n.language) === 'zh-CN' ? 'en' : 'zh-CN';
  localStorage.setItem(LANG_KEY, lang);
  i18n.changeLanguage(lang);
}
export function returnUserLangText(texts: Record<Languages, string>) {
  return texts[classifyLanguage(i18n.language)];
}

export function returnUserLangMsg(res: { msg_en: string; msg_zh: string }) {
  return returnUserLangText({
    en: res.msg_en,
    'zh-CN': res.msg_zh,
  });
}
