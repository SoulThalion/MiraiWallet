<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">

    <!-- HERO BANNER -->
    <div class="rounded-3xl p-5 md:p-7 mb-6 relative overflow-hidden dark:bg-gradient-to-br dark:from-[#091A30] dark:to-dark-card bg-gradient-to-br from-[#D8E8FA] to-light-card border border-brand-blue/10 dark:border-0">
      <div class="absolute -top-12 -right-12 w-56 h-56 rounded-full pointer-events-none"
           :style="{ background: 'radial-gradient(circle, rgba(0,71,204,0.14) 0%, transparent 70%)' }"></div>

      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
        <!-- Greeting -->
        <div>
          <p class="text-sm dark:text-dark-txt2 text-light-txt2">Bienvenido de vuelta</p>
          <p class="font-display font-black text-2xl md:text-3xl mt-0.5 dark:text-dark-txt text-light-txt">
            {{ store.userDisplayName }} 👋
          </p>
          <p v-if="statementLine" class="text-xs mt-1 dark:text-dark-txt2 text-light-txt2">
            {{ statementLine }}
          </p>
        </div>
        <!-- Balance (always visible, large on md+) -->
        <div class="rounded-2xl p-4 md:p-5 min-w-[200px] relative overflow-hidden dark:bg-dark-surf bg-white/80 border border-brand-blue/10 dark:border-0">
          <p class="text-[10px] uppercase tracking-widest mb-1 dark:text-dark-txt2 text-light-txt2">Saldo total</p>
          <p class="font-display font-black text-3xl md:text-4xl tracking-tight dark:text-dark-txt text-light-txt">
            <span class="text-lg font-semibold mr-0.5 dark:text-dark-txt2 text-light-txt2">€</span>
            {{ balanceParts.intPart }}<span class="text-lg font-semibold dark:text-dark-txt2 text-light-txt2">,{{ balanceParts.decPart }}</span>
          </p>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 mt-4 relative z-10">
        <div v-for="stat in balanceStats" :key="stat.label"
             class="rounded-xl p-3 dark:bg-dark-surf bg-white/70 border border-brand-blue/10 dark:border-0">
          <p class="text-[10px] md:text-xs dark:text-dark-txt2 text-light-txt2">{{ stat.label }}</p>
          <p :class="['text-sm md:text-base font-bold mt-1', stat.color]">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <!-- MAIN GRID: single col mobile → 2 col tablet → 3 col desktop -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

      <!-- Categories card -->
      <div :class="['mw-card lg:col-span-1']">
        <div class="flex justify-between items-center mb-4">
          <p class="font-display font-extrabold text-sm dark:text-dark-txt text-light-txt">Categorías</p>
          <RouterLink to="/stats" class="text-xs text-brand-blue">Ver todo →</RouterLink>
        </div>
        <!-- Mobile: horizontal scroll; md+: grid -->
        <div class="flex gap-2 overflow-x-auto md:overflow-visible md:grid md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 pb-1 md:pb-0">
          <div v-for="cat in store.categories" :key="cat.name"
               class="flex-shrink-0 md:flex-shrink rounded-2xl p-3 flex flex-col items-center gap-1.5 cursor-pointer border transition-colors hover:border-brand-blue/30 text-center dark:bg-dark-surf dark:border-white/[0.05] bg-light-surf border-brand-blue/5">
            <span class="text-2xl">{{ cat.icon }}</span>
            <span class="text-[10px] font-semibold dark:text-dark-txt2 text-light-txt2">{{ cat.name }}</span>
            <span class="text-xs font-bold dark:text-dark-txt text-light-txt">{{ categoryMoneyLabel(cat) }}</span>
          </div>
        </div>
      </div>

      <!-- Recent transactions — spans 2 cols on lg -->
      <div class="mw-card md:col-span-2 lg:col-span-2">
        <div class="flex justify-between items-center mb-4">
          <p class="font-display font-extrabold text-sm dark:text-dark-txt text-light-txt">Últimos movimientos</p>
          <RouterLink to="/movements" class="text-xs text-brand-blue">Ver todos →</RouterLink>
        </div>
        <!-- On lg show more transactions in a 2-column grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <TransactionItem v-for="tx in store.transactions" :key="tx.id" :tx="tx" />
        </div>
      </div>

      <!-- Quick actions (md+) — visible on tablet/desktop only -->
      <div :class="['mw-card hidden md:block lg:col-span-1']">
        <p class="font-display font-extrabold text-sm mb-4 dark:text-dark-txt text-light-txt">Acciones rápidas</p>
        <div class="flex flex-col gap-2">
          <RouterLink to="/add">
            <button class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-blue-dark to-brand-blue text-white text-sm font-semibold transition-opacity hover:opacity-90">
              <span>➕</span> Añadir gasto
            </button>
          </RouterLink>
          <RouterLink to="/stats">
            <button class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-colors dark:bg-dark-surf dark:border-white/[0.07] dark:text-dark-txt dark:hover:border-brand-blue/30 bg-light-surf border-brand-blue/10 text-light-txt hover:border-brand-blue/30">
              <span>📊</span> Ver estadísticas
            </button>
          </RouterLink>
          <RouterLink to="/alerts">
            <button class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-colors dark:bg-dark-surf dark:border-white/[0.07] dark:text-dark-txt dark:hover:border-brand-blue/30 bg-light-surf border-brand-blue/10 text-light-txt hover:border-brand-blue/30">
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
import { useCurrency } from '@/composables/useCurrency'
import TransactionItem from '@/components/TransactionItem.vue'

interface BalanceStat {
  label: string
  value: string
  color: string
}

const store = useWalletStore()
const { formatEuro, formatDateOnlyEs, roundMoney } = useCurrency()

/** Gasto e ingreso por categoría (2 decimales); solo gastos en desglose mostraba 0 en nómina. */
function categoryMoneyLabel(cat: { spent: number; incomeInCategory?: number }): string {
  const g = roundMoney(cat.spent)
  const inc = roundMoney(cat.incomeInCategory ?? 0)
  const parts: string[] = []
  if (g > 0) parts.push(formatEuro(g, false))
  if (inc > 0) parts.push(formatEuro(inc, true))
  if (parts.length === 0) return formatEuro(0, false)
  return parts.join(' · ')
}

/** Debe ser reactivo: el saldo llega asíncrono tras `initialize()`. */
const balanceParts = computed(() => {
  const [intStr, decStr] = store.balance.toFixed(2).split('.')
  return {
    intPart: parseInt(intStr, 10).toLocaleString('es-ES'),
    decPart: decStr,
  }
})

/** Una línea opcional con periodo y variación del último Excel ING (sin texto explicativo largo). */
const statementLine = computed(() => {
  const s = store.statementSnapshot
  if (!s) return ''
  const df = formatDateOnlyEs(s.firstDate)
  const dt = formatDateOnlyEs(s.lastDate)
  const range = df && dt ? `${df} – ${dt}` : ''
  return range
    ? `Último extracto (${range}): ${formatEuro(s.delta, true)}`
    : `Último extracto: ${formatEuro(s.delta, true)}`
})

const balanceStats = computed<BalanceStat[]>(() => {
  const net = store.monthNetCashflow
  return [
    { label: 'Ingresos (periodo)', value: formatEuro(store.monthIncome, true), color: 'text-brand-green' },
    { label: 'Gastos (periodo)', value: formatEuro(-store.monthExpenses, true), color: 'text-red-400' },
    {
      label: 'Neto del periodo',
      value: formatEuro(net, true),
      color: net >= 0 ? 'text-brand-green' : 'text-red-400',
    },
  ]
})
</script>
