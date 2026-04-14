import { createI18n } from 'vue-i18n'
import es from '@/locales/es'
import en from '@/locales/en'
import de from '@/locales/de'

export type LocaleCode = 'es' | 'en' | 'de'

const STORAGE_KEY = 'mirai:locale'
const SUPPORTED: LocaleCode[] = ['es', 'en', 'de']

function normalizeLocale(input?: string | null): LocaleCode | null {
  if (!input) return null
  const code = input.toLowerCase().split('-')[0] as LocaleCode
  return SUPPORTED.includes(code) ? code : null
}

function resolveInitialLocale(): LocaleCode {
  return (
    normalizeLocale(localStorage.getItem(STORAGE_KEY)) ??
    normalizeLocale(navigator.language) ??
    'es'
  )
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: resolveInitialLocale(),
  fallbackLocale: 'es',
  messages: { es, en, de },
})

export function setLocale(locale: LocaleCode): void {
  i18n.global.locale.value = locale
  localStorage.setItem(STORAGE_KEY, locale)
}

export function getCurrentLocale(): LocaleCode {
  return i18n.global.locale.value as LocaleCode
}

export default i18n
