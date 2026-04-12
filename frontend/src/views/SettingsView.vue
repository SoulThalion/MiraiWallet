<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

      <!-- Profile card -->
      <div class="mw-card md:col-span-2 lg:col-span-1">
        <div class="flex items-center gap-4 mb-5">
          <div class="w-14 h-14 rounded-[18px] bg-gradient-to-br from-brand-blue-dark to-brand-blue flex items-center justify-center font-display font-black text-lg text-white shadow-glow flex-shrink-0">
            {{ store.userInitials }}
          </div>
          <div>
            <p class="font-display font-extrabold text-base dark:text-dark-txt text-light-txt">{{ store.userDisplayName }}</p>
            <p class="text-xs mt-0.5 dark:text-dark-txt2 text-light-txt2">{{ store.user?.email ?? '—' }}</p>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <button type="button" class="w-full py-3 rounded-xl text-sm font-semibold border border-red-400/30 text-red-400 dark:bg-dark-surf bg-light-surf hover:bg-red-400/10 transition-colors" @click="onLogout">
            Cerrar sesión
          </button>
          <div v-for="toggle in toggles" :key="toggle.label"
               class="flex items-center justify-between rounded-xl px-4 py-3 border dark:bg-dark-surf dark:border-white/[0.07] bg-light-surf border-brand-blue/10">
            <span class="text-sm font-medium dark:text-dark-txt text-light-txt">{{ toggle.label }}</span>
            <button :class="['w-10 h-[22px] rounded-full relative transition-colors', toggle.value ? 'bg-brand-blue' : 'dark:bg-dark-elev bg-light-elev']"
                    @click="toggle.value = !toggle.value">
              <span :class="['absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all', toggle.value ? 'right-[3px]' : 'left-[3px]']"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- General settings -->
      <div class="mw-card md:col-span-2 lg:col-span-2">
        <p class="font-display font-bold text-sm mb-3 dark:text-dark-txt text-light-txt">Configuración</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="item in settingItems" :key="item.label"
               class="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer border transition-colors hover:border-brand-blue/30 dark:bg-dark-surf dark:border-white/[0.07] bg-light-surf border-brand-blue/10">
            <div :class="['w-9 h-9 rounded-[10px] flex items-center justify-center text-base flex-shrink-0', item.bg]">{{ item.icon }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate dark:text-dark-txt text-light-txt">{{ item.label }}</p>
              <p class="text-[10px] truncate dark:text-dark-txt2 text-light-txt2">{{ item.sub }}</p>
            </div>
            <span class="text-sm flex-shrink-0 dark:text-dark-txt3 text-light-txt3">›</span>
          </div>
        </div>
      </div>

      <!-- Theme card — full row -->
      <div class="mw-card md:col-span-2 lg:col-span-3">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">Apariencia</p>
            <p class="text-xs mt-0.5 dark:text-dark-txt2 text-light-txt2">Actualmente en modo <span class="dark:hidden">claro</span><span class="hidden dark:inline">oscuro</span></p>
          </div>
          <div class="flex gap-2">
            <button v-for="mode in ['Claro', 'Oscuro']" :key="mode"
                    :class="['flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                             mode === 'Oscuro'
                               ? 'dark:bg-brand-blue/10 dark:border-brand-blue dark:text-brand-blue bg-light-surf border-brand-blue/10 text-light-txt2'
                               : 'dark:bg-dark-surf dark:border-white/[0.07] dark:text-dark-txt2 bg-brand-blue/10 border-brand-blue text-brand-blue']"
                    @click="toggleMode(mode)">
              {{ mode === 'Claro' ? '☀️' : '🌙' }} {{ mode }}
            </button>
          </div>
        </div>
      </div>

      <!-- Version -->
      <div class="md:col-span-2 lg:col-span-3 flex items-center justify-center gap-2 py-2 opacity-40">
        <span class="text-xs dark:text-dark-txt2 text-light-txt2">Mirai Wallet v2.1.0</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'

interface Toggle {
  label: string
  value: boolean
}

interface SettingItem {
  icon: string
  label: string
  sub: string
  bg: string
}

const store = useWalletStore()
const router = useRouter()

async function onLogout(): Promise<void> {
  await store.logout()
  await router.replace({ name: 'login' })
}

const toggles = reactive<Toggle[]>([
  { label: 'Alertas inteligentes', value: true },
  { label: 'Notificaciones push', value: true },
])

const settingItems: SettingItem[] = [
  { icon: '💳', label: 'Cuentas bancarias', sub: '2 conectadas', bg: 'bg-brand-blue/10' },
  { icon: '🎯', label: 'Presupuesto mensual', sub: '€2.200 configurado', bg: 'bg-brand-green/10' },
  { icon: '🏷️', label: 'Categorías', sub: 'Personalizar etiquetas', bg: 'bg-brand-gold/10' },
  { icon: '🔒', label: 'Privacidad', sub: 'Face ID activado', bg: 'bg-purple-400/10' },
  { icon: '📤', label: 'Exportar datos', sub: 'PDF, Excel o CSV', bg: 'bg-red-400/10' },
  { icon: '🔗', label: 'Integraciones', sub: 'Bancos y servicios', bg: 'bg-brand-gold/10' },
]

const toggleMode = (mode: string): void => {
  const isCurrentlyDark = document.documentElement.classList.contains('dark')
  if ((mode === 'Oscuro') !== isCurrentlyDark) {
    store.toggleDark();
  }
}
</script>
