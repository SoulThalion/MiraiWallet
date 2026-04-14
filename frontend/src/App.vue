<template>
  <router-view v-if="isBare" />

  <div v-else class="min-h-screen bg-light-bg text-light-txt transition-colors duration-200 dark:bg-dark-bg dark:text-dark-txt">

    <aside :class="[
      'hidden md:flex flex-col fixed top-0 left-0 h-screen z-30 transition-all duration-200 border-r',
      sidebarExpanded ? 'w-56' : 'w-16',
      'dark:bg-dark-card dark:border-white/[0.07] bg-light-card border-brand-blue/10'
    ]">
      <div class="flex items-center gap-3 px-3 py-5 border-b dark:border-white/[0.07] border-brand-blue/10">
        <MwLogo size="sm" class="flex-shrink-0" />
        <div v-if="sidebarExpanded" class="overflow-hidden">
          <span class="font-display font-black text-base bg-gradient-to-r from-brand-blue to-brand-blue/70 bg-clip-text text-transparent whitespace-nowrap">Mirai</span>
          <span :class="['font-display font-bold text-base whitespace-nowrap ml-1', 'dark:text-dark-txt2 text-light-txt2']">Wallet</span>
        </div>
      </div>

      <nav class="flex flex-col gap-1 px-2 py-4 flex-1">
        <RouterLink v-for="item in navItems" :key="item.name" :to="item.to" custom v-slot="{ isActive, navigate }">
          <button :class="[
            'flex items-center gap-3 rounded-xl px-3 py-2.5 w-full transition-colors text-left group',
            isActive
              ? 'bg-brand-blue/10 text-brand-blue'
              : 'dark:text-dark-txt2 dark:hover:bg-white/5 dark:hover:text-dark-txt text-light-txt2 hover:bg-brand-blue/5 hover:text-light-txt'
          ]" @click="navigate">
            <span class="text-lg flex-shrink-0">{{ item.icon }}</span>
          <span v-if="sidebarExpanded" class="text-sm font-semibold whitespace-nowrap">{{ item.label }}</span>
          </button>
        </RouterLink>
      </nav>

      <div class="px-2 py-3 border-t flex flex-col gap-1 dark:border-white/[0.07] border-brand-blue/10">
        <button class="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full transition-colors dark:text-dark-txt2 dark:hover:bg-white/5 text-light-txt2 hover:bg-brand-blue/5" @click="store.toggleDark">
          <span class="text-lg flex-shrink-0">{{ store.darkMode ? '🌙' : '☀️' }}</span>
            <span v-if="sidebarExpanded" class="text-sm font-semibold whitespace-nowrap">
            <span class="hidden dark:inline">{{ t('layout.lightMode') }}</span>
            <span class="dark:hidden">{{ t('layout.darkMode') }}</span>
          </span>
        </button>
        <button class="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full transition-colors dark:text-dark-txt2 dark:hover:bg-white/5 text-light-txt2 hover:bg-brand-blue/5" @click="sidebarExpanded = !sidebarExpanded">
          <span class="text-lg flex-shrink-0 leading-none">{{ sidebarExpanded ? '◀' : '▶' }}</span>
          <span v-if="sidebarExpanded" class="text-sm font-semibold whitespace-nowrap">{{ t('layout.collapse') }}</span>
        </button>
      </div>
    </aside>

    <div
      :class="[
        'flex flex-col transition-all duration-200',
        'md:pl-16',
        sidebarExpanded ? 'lg:pl-56' : 'lg:pl-16',
        route.meta.fullHeight ? 'h-dvh min-h-0 overflow-hidden' : 'min-h-screen',
      ]"
    >

      <header class="hidden md:flex flex-shrink-0 items-center justify-between px-6 py-3 border-b sticky top-0 z-20 dark:bg-dark-card/95 dark:border-white/[0.07] bg-light-card/95 border-brand-blue/10 backdrop-blur-sm">
        <div>
          <h1 class="font-display font-black text-xl dark:text-dark-txt text-light-txt">{{ currentPageTitle }}</h1>
          <p class="text-xs mt-0.5 dark:text-dark-txt2 text-light-txt2 capitalize">{{ headerDate }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl border dark:bg-dark-surf dark:border-white/[0.07] bg-light-surf border-brand-blue/10">
            <span class="text-xs dark:text-dark-txt2 text-light-txt2">{{ t('common.balance') }}</span>
            <span class="font-display font-extrabold text-sm text-brand-blue">€{{ store.balance.toLocaleString(localeTag, { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div ref="desktopLocaleMenuRef" class="relative hidden lg:block">
            <button
              type="button"
              class="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors dark:bg-dark-surf dark:border-white/[0.07] dark:text-dark-txt2 dark:hover:border-brand-blue/40 bg-light-surf border-brand-blue/10 text-light-txt2 hover:border-brand-blue/40"
              @click="desktopLocaleMenuOpen = !desktopLocaleMenuOpen"
            >
              <span class="text-sm" aria-hidden="true">{{ activeLocaleOption.flag }}</span>
              <span>{{ selectedLocale.toUpperCase() }}</span>
              <span class="text-[10px] opacity-70" aria-hidden="true">{{ desktopLocaleMenuOpen ? '▲' : '▼' }}</span>
            </button>
            <transition name="fade">
              <div
                v-if="desktopLocaleMenuOpen"
                class="absolute right-0 top-[calc(100%+8px)] z-40 w-44 rounded-xl border p-1.5 shadow-xl dark:bg-dark-card dark:border-white/[0.08] bg-light-card border-brand-blue/10"
              >
                <button
                  v-for="opt in localeOptions"
                  :key="opt.code"
                  type="button"
                  class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors"
                  :class="selectedLocale === opt.code
                    ? 'bg-brand-blue/12 text-brand-blue font-semibold'
                    : 'dark:text-dark-txt2 text-light-txt2 hover:bg-brand-blue/8'"
                  @click="selectLocale(opt.code)"
                >
                  <span aria-hidden="true">{{ opt.flag }}</span>
                  <span class="flex-1">{{ t(opt.labelKey) }}</span>
                  <span v-if="selectedLocale === opt.code" class="text-[11px]" aria-hidden="true">✓</span>
                </button>
              </div>
            </transition>
          </div>
          <RouterLink to="/add">
            <button class="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue-dark to-brand-blue text-white text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity">
              <span class="text-base leading-none">+</span>
              <span class="hidden lg:inline">{{ t('nav.addExpense') }}</span>
            </button>
          </RouterLink>
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue-dark to-brand-blue flex items-center justify-center font-display font-black text-xs text-white flex-shrink-0">
            {{ store.userInitials }}
          </div>
        </div>
      </header>

      <main
        :class="[
          'flex-1',
          route.meta.fullHeight ? 'flex min-h-0 flex-col overflow-hidden pb-20 md:pb-0' : 'pb-20 md:pb-0',
        ]"
      >
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component
              :is="Component"
              :class="route.meta.fullHeight ? 'flex min-h-0 min-w-0 flex-1 flex-col' : undefined"
            />
          </transition>
        </router-view>
      </main>
    </div>

    <div ref="mobileLocaleMenuRef" class="fixed right-3 top-3 z-40 md:hidden">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-semibold shadow-sm backdrop-blur-sm transition-colors dark:bg-dark-card/90 dark:border-white/[0.08] dark:text-dark-txt2 dark:hover:border-brand-blue/40 bg-light-card/90 border-brand-blue/15 text-light-txt2 hover:border-brand-blue/40"
        @click="mobileLocaleMenuOpen = !mobileLocaleMenuOpen"
      >
        <span aria-hidden="true">{{ activeLocaleOption.flag }}</span>
        <span>{{ selectedLocale.toUpperCase() }}</span>
      </button>
      <transition name="fade">
        <div
          v-if="mobileLocaleMenuOpen"
          class="absolute right-0 mt-2 w-40 rounded-xl border p-1.5 shadow-xl dark:bg-dark-card dark:border-white/[0.08] bg-light-card border-brand-blue/12"
        >
          <button
            v-for="opt in localeOptions"
            :key="`m-${opt.code}`"
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors"
            :class="selectedLocale === opt.code
              ? 'bg-brand-blue/12 text-brand-blue font-semibold'
              : 'dark:text-dark-txt2 text-light-txt2 hover:bg-brand-blue/8'"
            @click="selectLocale(opt.code)"
          >
            <span aria-hidden="true">{{ opt.flag }}</span>
            <span class="flex-1">{{ t(opt.labelKey) }}</span>
            <span v-if="selectedLocale === opt.code" class="text-[11px]" aria-hidden="true">✓</span>
          </button>
        </div>
      </transition>
    </div>
    <BottomNav class="md:hidden" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useWalletStore } from '@/stores/wallet'
import { useTheme } from '@/composables/useTheme'
import { type LocaleCode, setLocale } from '@/i18n'
import MwLogo from '@/components/MwLogo.vue'
import BottomNav from '@/components/BottomNav.vue'

/** Sincroniza `store.darkMode` con la clase `dark` en `<html>` (necesario para Tailwind). */
useTheme()

interface NavItem {
  name: string
  to: string
  icon: string
  label: string
}
interface LocaleOption {
  code: LocaleCode
  labelKey: 'common.spanish' | 'common.english' | 'common.german'
  flag: string
}

const store = useWalletStore()
const route = useRoute()
const sidebarExpanded = ref<boolean>(true)
const { t, locale } = useI18n()

const isBare = computed<boolean>(() => Boolean(route.meta.bare))
const selectedLocale = computed<LocaleCode>({
  get: () => locale.value as LocaleCode,
  set: (value) => setLocale(value),
})
const desktopLocaleMenuOpen = ref(false)
const mobileLocaleMenuOpen = ref(false)
const desktopLocaleMenuRef = ref<HTMLElement | null>(null)
const mobileLocaleMenuRef = ref<HTMLElement | null>(null)
const localeOptions: LocaleOption[] = [
  { code: 'es', labelKey: 'common.spanish', flag: '🇪🇸' },
  { code: 'en', labelKey: 'common.english', flag: '🇬🇧' },
  { code: 'de', labelKey: 'common.german', flag: '🇩🇪' },
]
const activeLocaleOption = computed<LocaleOption>(() =>
  localeOptions.find((opt) => opt.code === selectedLocale.value) ?? localeOptions[0]
)

function selectLocale(code: LocaleCode): void {
  selectedLocale.value = code
  desktopLocaleMenuOpen.value = false
  mobileLocaleMenuOpen.value = false
}

function handleOutsideClick(event: MouseEvent): void {
  const target = event.target as Node
  if (desktopLocaleMenuRef.value && !desktopLocaleMenuRef.value.contains(target)) {
    desktopLocaleMenuOpen.value = false
  }
  if (mobileLocaleMenuRef.value && !mobileLocaleMenuRef.value.contains(target)) {
    mobileLocaleMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
const localeTag = computed<string>(() => {
  if (selectedLocale.value === 'en') return 'en-US'
  if (selectedLocale.value === 'de') return 'de-DE'
  return 'es-ES'
})

const headerDate = computed<string>(() =>
  new Date().toLocaleDateString(localeTag.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
)

/**
 * Carga datos del API al entrar en cualquier vista con `requiresAuth`.
 * Solo `onMounted` fallaba: si la primera ruta era `/` o `/login`, al ir a `/home`
 * el layout ya estaba montado y no se volvía a llamar a `initialize()`.
 */
watch(
  () => route.fullPath,
  () => {
    if (route.meta.requiresAuth && localStorage.getItem('token')) {
      void store.initialize()
    }
  },
  { immediate: true }
)

const navItems = computed<NavItem[]>(() => [
  { name: 'home', to: '/home', icon: '🏠', label: t('nav.home') },
  { name: 'movements', to: '/movements', icon: '📋', label: t('nav.movements') },
  { name: 'stats', to: '/stats', icon: '📊', label: t('nav.stats') },
  { name: 'add', to: '/add', icon: '➕', label: t('nav.addExpense') },
  { name: 'alerts', to: '/alerts', icon: '🔔', label: t('nav.alerts') },
  { name: 'import', to: '/import', icon: '📥', label: t('nav.import') },
  { name: 'settings', to: '/settings', icon: '⚙️', label: t('nav.settings') },
])

const pageTitles = computed<Record<string, string>>(() => ({
  home: t('nav.home'),
  movements: t('nav.movements'),
  stats: t('nav.stats'),
  add: t('nav.addExpense'),
  alerts: t('nav.alerts'),
  settings: t('nav.settings'),
  import: t('nav.import'),
  onboarding: t('nav.home'),
  login: t('auth.loginTitle'),
  register: t('auth.registerTitle'),
}))
const currentPageTitle = computed<string>(() => pageTitles.value[route.name as string] ?? t('layout.appName'))
</script>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
