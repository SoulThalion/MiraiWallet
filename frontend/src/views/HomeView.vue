<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">

    <!-- HERO BANNER -->
    <div :class="[
      'rounded-3xl p-5 md:p-7 mb-6 relative overflow-hidden',
      isDark
        ? 'bg-gradient-to-br from-[#091A30] to-dark-card'
        : 'bg-gradient-to-br from-[#D8E8FA] to-light-card border border-brand-blue/10'
    ]">
      <div class="absolute -top-12 -right-12 w-56 h-56 rounded-full pointer-events-none"
           :style="{ background: 'radial-gradient(circle, rgba(0,71,204,0.14) 0%, transparent 70%)' }"></div>

      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
        <!-- Greeting -->
        <div>
          <p :class="['text-sm', isDark ? 'text-dark-txt2' : 'text-light-txt2']">Bienvenido de vuelta</p>
          <p :class="['font-display font-black text-2xl md:text-3xl mt-0.5', isDark ? 'text-dark-txt' : 'text-light-txt']">
            Carlos García 👋
          </p>
          <p :class="['text-xs mt-1', isDark ? 'text-dark-txt2' : 'text-light-txt2']">
            Aquí tienes el resumen de este mes
          </p>
        </div>
        <!-- Balance (always visible, large on md+) -->
        <div :class="['rounded-2xl p-4 md:p-5 min-w-[200px] relative overflow-hidden', isDark ? 'bg-dark-surf' : 'bg-white/80 border border-brand-blue/10']">
          <p :class="['text-[10px] uppercase tracking-widest mb-1', isDark ? 'text-dark-txt2' : 'text-light-txt2']">Saldo total</p>
          <p :class="['font-display font-black text-3xl md:text-4xl tracking-tight', isDark ? 'text-dark-txt' : 'text-light-txt']">
            <span :class="['text-lg font-semibold mr-0.5', isDark ? 'text-dark-txt2' : 'text-light-txt2']">€</span>
            {{ intPart }}<span :class="['text-lg font-semibold', isDark ? 'text-dark-txt2' : 'text-light-txt2']">,{{ decPart }}</span>
          </p>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-3 gap-2 md:gap-3 mt-4 relative z-10">
        <div v-for="stat in balanceStats" :key="stat.label"
             :class="['rounded-xl p-3', isDark ? 'bg-dark-surf' : 'bg-white/70 border border-brand-blue/10']">
          <p :class="['text-[10px] md:text-xs', isDark ? 'text-dark-txt2' : 'text-light-txt2']">{{ stat.label }}</p>
          <p :class="['text-sm md:text-base font-bold mt-1', stat.color]">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <!-- MAIN GRID: single col mobile → 2 col tablet → 3 col desktop -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

      <!-- Categories card -->
      <div :class="['mw-card lg:col-span-1']">
        <div class="flex justify-between items-center mb-4">
          <p :class="['font-display font-extrabold text-sm', isDark ? 'text-dark-txt' : 'text-light-txt']">Categorías</p>
          <RouterLink to="/stats" class="text-xs text-brand-blue">Ver todo →</RouterLink>
        </div>
        <!-- Mobile: horizontal scroll; md+: grid -->
        <div class="flex gap-2 overflow-x-auto md:overflow-visible md:grid md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 pb-1 md:pb-0">
          <div v-for="cat in store.categories" :key="cat.name"
               :class="['flex-shrink-0 md:flex-shrink rounded-2xl p-3 flex flex-col items-center gap-1.5 cursor-pointer border transition-colors hover:border-brand-blue/30 text-center',
                        isDark ? 'bg-dark-surf border-white/[0.05]' : 'bg-light-surf border-brand-blue/5']">
            <span class="text-2xl">{{ cat.icon }}</span>
            <span :class="['text-[10px] font-semibold', isDark ? 'text-dark-txt2' : 'text-light-txt2']">{{ cat.name }}</span>
            <span :class="['text-xs font-bold', isDark ? 'text-dark-txt' : 'text-light-txt']">€{{ cat.spent }}</span>
          </div>
        </div>
      </div>

      <!-- Recent transactions — spans 2 cols on lg -->
      <div class="mw-card md:col-span-2 lg:col-span-2">
        <div class="flex justify-between items-center mb-4">
          <p :class="['font-display font-extrabold text-sm', isDark ? 'text-dark-txt' : 'text-light-txt']">Últimos movimientos</p>
          <span class="text-xs text-brand-blue cursor-pointer">Ver todos →</span>
        </div>
        <!-- On lg show more transactions in a 2-column grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <TransactionItem v-for="tx in store.transactions" :key="tx.id" :tx="tx" />
        </div>
      </div>

      <!-- Quick actions (md+) — visible on tablet/desktop only -->
      <div :class="['mw-card hidden md:block lg:col-span-1']">
        <p :class="['font-display font-extrabold text-sm mb-4', isDark ? 'text-dark-txt' : 'text-light-txt']">Acciones rápidas</p>
        <div class="flex flex-col gap-2">
          <RouterLink to="/add">
            <button class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-blue-dark to-brand-blue text-white text-sm font-semibold transition-opacity hover:opacity-90">
              <span>➕</span> Añadir gasto
            </button>
          </RouterLink>
          <RouterLink to="/stats">
            <button :class="['w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-colors', isDark ? 'bg-dark-surf border-white/[0.07] text-dark-txt hover:border-brand-blue/30' : 'bg-light-surf border-brand-blue/10 text-light-txt hover:border-brand-blue/30']">
              <span>📊</span> Ver estadísticas
            </button>
          </RouterLink>
          <RouterLink to="/alerts">
            <button :class="['w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-colors', isDark ? 'bg-dark-surf border-white/[0.07] text-dark-txt hover:border-brand-blue/30' : 'bg-light-surf border-brand-blue/10 text-light-txt hover:border-brand-blue/30']">
              <span>🔔</span> Alertas <span class="ml-auto bg-red-400/15 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded">{{ store.alerts.length }}</span>
            </button>
          </RouterLink>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useTheme } from '@/composables/useTheme'
import { useCurrency } from '@/composables/useCurrency'
import TransactionItem from '@/components/TransactionItem.vue'

interface BalanceStat {
  label: string
  value: string
  color: string
}

const store = useWalletStore()
const { isDark } = useTheme()
const { formatEuro } = useCurrency()

const [intStr, decStr] = store.balance.toFixed(2).split('.')
const intPart = parseInt(intStr).toLocaleString('es-ES')
const decPart = decStr

const balanceStats = computed<BalanceStat[]>(() => [
  { label: 'Ingresos', value: formatEuro(store.totalIncome, true), color: 'text-brand-green' },
  { label: 'Gastos', value: formatEuro(-store.totalExpenses, true), color: 'text-red-400' },
  { label: 'Ahorrado', value: formatEuro(store.saved, true), color: 'text-brand-green' },
])
</script>
