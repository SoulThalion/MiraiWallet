<template>
  <div :class="[
    'min-h-screen flex items-center justify-center p-4',
    isDark ? 'bg-gradient-to-br from-[#071426] via-dark-bg to-[#071E10]' : 'bg-gradient-to-br from-[#D8EAFB] via-light-bg to-[#EAF5EE]'
  ]">
    <div class="w-full max-w-md mx-auto flex flex-col items-center text-center">

      <!-- Logo -->
      <MwLogo size="lg" class="mb-5" />
      <div class="flex items-baseline gap-1 mb-2">
        <span class="font-display font-black text-4xl bg-gradient-to-r from-brand-blue to-brand-blue/70 bg-clip-text text-transparent">Mirai</span>
        <span :class="['font-display font-bold text-4xl', isDark ? 'text-dark-txt2' : 'text-light-txt2']">Wallet</span>
      </div>
      <p :class="['text-sm mb-10', isDark ? 'text-dark-txt2' : 'text-light-txt2']">
        <span :class="['font-medium', isDark ? 'text-dark-txt' : 'text-light-txt']">Your Money, Your Future</span>
      </p>

      <!-- Features -->
      <div class="w-full flex flex-col gap-3 mb-8">
        <div v-for="f in features" :key="f.title" class="mw-card flex items-center gap-4 text-left">
          <div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0', f.bg]">{{ f.icon }}</div>
          <div>
            <p :class="['text-sm font-semibold', isDark ? 'text-dark-txt' : 'text-light-txt']">{{ f.title }}</p>
            <p :class="['text-xs mt-0.5', isDark ? 'text-dark-txt2' : 'text-light-txt2']">{{ f.desc }}</p>
          </div>
        </div>
      </div>

      <button class="btn-primary mb-3" @click="start">Comenzar →</button>
      <button :class="['text-sm underline underline-offset-2', isDark ? 'text-dark-txt2' : 'text-light-txt2']">Ya tengo una cuenta</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useTheme } from '@/composables/useTheme'
import MwLogo from '@/components/MwLogo.vue'

interface Feature {
  icon: string
  title: string
  desc: string
  bg: string
}

const router = useRouter()
const store = useWalletStore()
const { isDark } = useTheme()

const features: Feature[] = [
  { icon: '📊', title: 'Visualiza tus gastos', desc: 'Gráficos interactivos por categoría y mes', bg: 'bg-brand-blue/10' },
  { icon: '🔔', title: 'Alertas inteligentes', desc: 'Sugerencias de pago y financiación', bg: 'bg-brand-green/10' },
  { icon: '💳', title: 'Importa movimientos', desc: 'Conecta tu banco o añade manualmente', bg: 'bg-brand-gold/10' },
]

function start(): void {
  store.completeOnboarding()
  router.push('/home')
}
</script>
