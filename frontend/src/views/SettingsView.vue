<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

      <!-- Profile card -->
      <div class="mw-card md:col-span-2 lg:col-span-1">
        <div class="flex items-center gap-4 mb-5">
          <div class="w-14 h-14 rounded-[18px] bg-gradient-to-br from-brand-blue-dark to-brand-blue flex items-center justify-center font-display font-black text-xl text-white shadow-glow flex-shrink-0">CG</div>
          <div>
            <p :class="['font-display font-extrabold text-base', isDark ? 'text-dark-txt' : 'text-light-txt']">Carlos García</p>
            <p :class="['text-xs mt-0.5', isDark ? 'text-dark-txt2' : 'text-light-txt2']">carlos@email.com</p>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div v-for="toggle in toggles" :key="toggle.label"
               :class="['flex items-center justify-between rounded-xl px-4 py-3 border', isDark ? 'bg-dark-surf border-white/[0.07]' : 'bg-light-surf border-brand-blue/10']">
            <span :class="['text-sm font-medium', isDark ? 'text-dark-txt' : 'text-light-txt']">{{ toggle.label }}</span>
            <button :class="['w-10 h-[22px] rounded-full relative transition-colors', toggle.value ? 'bg-brand-blue' : (isDark ? 'bg-dark-elev' : 'bg-light-elev')]"
                    @click="toggle.value = !toggle.value">
              <span :class="['absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all', toggle.value ? 'right-[3px]' : 'left-[3px]']"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- General settings -->
      <div class="mw-card md:col-span-2 lg:col-span-2">
        <p :class="['font-display font-bold text-sm mb-3', isDark ? 'text-dark-txt' : 'text-light-txt']">Configuración</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="item in settingItems" :key="item.label"
               :class="['flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer border transition-colors hover:border-brand-blue/30', isDark ? 'bg-dark-surf border-white/[0.07]' : 'bg-light-surf border-brand-blue/10']">
            <div :class="['w-9 h-9 rounded-[10px] flex items-center justify-center text-base flex-shrink-0', item.bg]">{{ item.icon }}</div>
            <div class="flex-1 min-w-0">
              <p :class="['text-sm font-semibold truncate', isDark ? 'text-dark-txt' : 'text-light-txt']">{{ item.label }}</p>
              <p :class="['text-[10px] truncate', isDark ? 'text-dark-txt2' : 'text-light-txt2']">{{ item.sub }}</p>
            </div>
            <span :class="['text-sm flex-shrink-0', isDark ? 'text-dark-txt3' : 'text-light-txt3']">›</span>
          </div>
        </div>
      </div>

      <!-- Theme card — full row -->
      <div class="mw-card md:col-span-2 lg:col-span-3">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p :class="['font-display font-bold text-sm', isDark ? 'text-dark-txt' : 'text-light-txt']">Apariencia</p>
            <p :class="['text-xs mt-0.5', isDark ? 'text-dark-txt2' : 'text-light-txt2']">Actualmente en modo {{ isDark ? 'oscuro' : 'claro' }}</p>
          </div>
          <div class="flex gap-2">
            <button v-for="mode in ['Claro', 'Oscuro']" :key="mode"
                    :class="['flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                             (mode === 'Oscuro') === isDark
                               ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
                               : isDark ? 'bg-dark-surf border-white/[0.07] text-dark-txt2' : 'bg-light-surf border-brand-blue/10 text-light-txt2']"
                    @click="toggleMode(mode)">
              {{ mode === 'Claro' ? '☀️' : '🌙' }} {{ mode }}
            </button>
          </div>
        </div>
      </div>

      <!-- Version -->
      <div class="md:col-span-2 lg:col-span-3 flex items-center justify-center gap-2 py-2 opacity-40">
        <span :class="['text-xs', isDark ? 'text-dark-txt2' : 'text-light-txt2']">Mirai Wallet v2.1.0</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useWalletStore }     from '@/stores/wallet'
import { useTheme }           from '@/composables/useTheme'

const store      = useWalletStore()
const { isDark } = useTheme()

const toggles = reactive([
  { label: 'Alertas inteligentes', value: true },
  { label: 'Notificaciones push',  value: true },
])

const settingItems = [
  { icon: '💳', label: 'Cuentas bancarias',   sub: '2 conectadas',           bg: 'bg-brand-blue/10' },
  { icon: '🎯', label: 'Presupuesto mensual', sub: '€2.200 configurado',     bg: 'bg-brand-green/10' },
  { icon: '🏷️', label: 'Categorías',          sub: 'Personalizar etiquetas', bg: 'bg-brand-gold/10' },
  { icon: '🔒', label: 'Privacidad',           sub: 'Face ID activado',       bg: 'bg-purple-400/10' },
  { icon: '📤', label: 'Exportar datos',       sub: 'PDF, Excel o CSV',       bg: 'bg-red-400/10' },
  { icon: '🔗', label: 'Integraciones',        sub: 'Bancos y servicios',     bg: 'bg-brand-gold/10' },
]

const toggleMode = (mode) => {
  if ((mode === 'Oscuro') !== isDark.value) {
    store.toggleDark();
  }
}
</script>
