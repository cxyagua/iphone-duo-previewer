import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zh from './locales/zh.json'

export type LocaleCode = 'en' | 'zh'

const STORAGE_KEY = 'iduo-locale'

function detectInitialLocale(): LocaleCode {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'en' || saved === 'zh') return saved
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectInitialLocale(),
  fallbackLocale: 'en',
  messages: { en, zh },
})

export function setLocale(locale: LocaleCode) {
  i18n.global.locale.value = locale
  localStorage.setItem(STORAGE_KEY, locale)
}
