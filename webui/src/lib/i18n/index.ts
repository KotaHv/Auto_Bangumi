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

function initialLang(): Languages {
  const stored = localStorage.getItem(LANG_KEY) as Languages | null;
  if (stored && stored in messages) return stored;
  return navigator.language as Languages;
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
  const lang = (i18n.language === 'zh-CN' ? 'en' : 'zh-CN') as Languages;
  localStorage.setItem(LANG_KEY, lang);
  i18n.changeLanguage(lang);
}
export function returnUserLangText(texts: Record<Languages, string>) {
  return texts[(i18n.language as Languages) ?? 'en'];
}

export function returnUserLangMsg(res: { msg_en: string; msg_zh: string }) {
  return returnUserLangText({
    en: res.msg_en,
    'zh-CN': res.msg_zh,
  });
}
