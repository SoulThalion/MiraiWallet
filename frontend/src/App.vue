<template>
  <router-view v-if="isBare" />

  <div v-else class="min-h-screen transition-colors duration-200 dark bg-dark-bg bg-light-bg">

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
          <span v-if="sidebarExpanded" class="text-sm font-semibold whitespace-nowrap dark:hidden">Modo claro</span>
        </button>
        <button class="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full transition-colors dark:text-dark-txt2 dark:hover:bg-white/5 text-light-txt2 hover:bg-brand-blue/5" @click="sidebarExpanded = !sidebarExpanded">
          <span class="text-lg flex-shrink-0 leading-none">{{ sidebarExpanded ? '◀' : '▶' }}</span>
          <span v-if="sidebarExpanded" class="text-sm font-semibold whitespace-nowrap">Colapsar</span>
        </button>
      </div>
    </aside>

    <div :class="['flex flex-col min-h-screen transition-all duration-200', 'md:pl-16', sidebarExpanded ? 'lg:pl-56' : 'lg:pl-16']">

      <header class="hidden md:flex items-center justify-between px-6 py-3 border-b sticky top-0 z-20 dark:bg-dark-card/95 dark:border-white/[0.07] bg-light-card/95 border-brand-blue/10 backdrop-blur-sm">
        <div>
          <h1 class="font-display font-black text-xl dark:text-dark-txt text-light-txt">{{ currentPageTitle }}</h1>
          <p class="text-xs mt-0.5 dark:text-dark-txt2 text-light-txt2 capitalize">{{ headerDate }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl border dark:bg-dark-surf dark:border-white/[0.07] bg-light-surf border-brand-blue/10">
            <span class="text-xs dark:text-dark-txt2 text-light-txt2">Saldo</span>
            <span class="font-display font-extrabold text-sm text-brand-blue">€{{ store.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 }) }}</span>
          </div>
          <RouterLink to="/add">
            <button class="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue-dark to-brand-blue text-white text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity">
              <span class="text-base leading-none">+</span>
              <span class="hidden lg:inline">Añadir gasto</span>
            </button>
          </RouterLink>
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue-dark to-brand-blue flex items-center justify-center font-display font-black text-xs text-white flex-shrink-0">
            {{ store.userInitials }}
          </div>
        </div>
      </header>

      <main class="flex-1 pb-20 md:pb-0">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <BottomNav class="md:hidden" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import MwLogo from '@/components/MwLogo.vue'
import BottomNav from '@/components/BottomNav.vue'

interface NavItem {
  name: string
  to: string
  icon: string
  label: string
}

const store = useWalletStore()
const route = useRoute()
const sidebarExpanded = ref<boolean>(true)

const isBare = computed<boolean>(() => Boolean(route.meta.bare))

const headerDate = computed<string>(() =>
  new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
)

function bootstrapIfNeeded(): void {
  if (route.meta.requiresAuth && localStorage.getItem('token')) {
    void store.initialize()
  }
}

onMounted(bootstrapIfNeeded)

const navItems: NavItem[] = [
  { name: 'home', to: '/home', icon: '🏠', label: 'Inicio' },
  { name: 'stats', to: '/stats', icon: '📊', label: 'Estadísticas' },
  { name: 'add', to: '/add', icon: '➕', label: 'Añadir gasto' },
  { name: 'alerts', to: '/alerts', icon: '🔔', label: 'Alertas' },
  { name: 'settings', to: '/settings', icon: '⚙️', label: 'Ajustes' },
]

const pageTitles: Record<string, string> = {
  home: 'Inicio',
  stats: 'Estadísticas',
  add: 'Añadir gasto',
  alerts: 'Alertas',
  settings: 'Ajustes',
  onboarding: 'Bienvenido',
  login: 'Acceso',
  register: 'Registro'
}
const currentPageTitle = computed<string>(() => pageTitles[route.name as string] ?? 'Mirai Wallet')
</script>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
