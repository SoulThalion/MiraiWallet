<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <!-- Cabecera + periodo -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <p class="text-sm dark:text-dark-txt2 text-light-txt2">
          Periodo fiscal: <span class="font-semibold dark:text-dark-txt text-light-txt">{{ periodLabel }}</span>
        </p>
      </div>
      <button
        type="button"
        class="self-start sm:self-auto text-xs font-semibold px-4 py-2 rounded-xl border dark:border-white/10 dark:text-dark-txt2 text-light-txt2 dark:hover:bg-dark-surf hover:bg-light-surf transition-colors disabled:opacity-50"
        :disabled="refreshing"
        @click="refresh">
        {{ refreshing ? 'Actualizando…' : 'Actualizar datos' }}
      </button>
    </div>

    <!-- KPIs del periodo (mismo origen que inicio / dashboard) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-6">
      <div
        v-for="k in kpiRow"
        :key="k.label"
        class="mw-card !p-3 md:!p-4">
        <p class="text-[10px] md:text-xs dark:text-dark-txt2 text-light-txt2">{{ k.label }}</p>
        <p :class="['text-sm md:text-base font-bold mt-1 font-display', k.colorClass]">{{ k.value }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      <!-- Columna principal: derivados + API -->
      <div class="lg:col-span-2 flex flex-col gap-4">
        <section>
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">Detectado automáticamente</h2>
            <RouterLink to="/stats" class="text-xs text-brand-blue font-semibold">Estadísticas →</RouterLink>
          </div>
          <p class="text-xs dark:text-dark-txt2 text-light-txt2 mb-3">
            Presupuestos del periodo; gasto e ingresos del <span class="font-medium dark:text-dark-txt text-light-txt">mismo periodo fiscal</span>.
            La media de gasto es la de <span class="font-medium dark:text-dark-txt text-light-txt">Estadísticas</span>: total de gastos de los últimos 12 meses con datos ÷ meses con gasto en esa ventana.
          </p>

          <div v-if="derivedInsights.length === 0" class="mw-card text-center py-8 px-4">
            <p class="text-2xl mb-2">✅</p>
            <p class="text-sm font-semibold dark:text-dark-txt text-light-txt">Todo en orden</p>
            <p class="text-xs mt-1 dark:text-dark-txt2 text-light-txt2">
              No hay desviaciones claras respecto a presupuestos o a tu media de gasto.
            </p>
          </div>

          <div v-else class="flex flex-col gap-3">
            <article
              v-for="ins in derivedInsights"
              :key="ins.key"
              :class="['alert-card relative overflow-hidden rounded-2xl p-4 pl-5 flex gap-3 border', styleFor(ins.type).border]">
              <div :class="['absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[3px]', styleFor(ins.type).accent]" />
              <div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0', styleFor(ins.type).iconBg]">
                {{ styleFor(ins.type).icon }}
              </div>
              <div class="flex-1 min-w-0 pr-2">
                <span :class="['inline-block px-2 py-0.5 rounded-md text-[9px] font-bold mb-1', styleFor(ins.type).badge]">
                  {{ ins.badge }}
                </span>
                <p class="text-[13px] font-bold dark:text-dark-txt text-light-txt">{{ ins.title }}</p>
                <p class="text-[11px] mt-1 leading-relaxed dark:text-dark-txt2 text-light-txt2">{{ ins.body }}</p>
                <p v-if="ins.amount" :class="['font-display font-extrabold text-sm mt-2', styleFor(ins.type).amount]">
                  {{ ins.amount }}
                </p>
              </div>
            </article>
          </div>
        </section>

        <section>
          <div class="flex items-center gap-3 mb-2">
            <h2 class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">Notificaciones</h2>
            <span v-if="store.alerts.length" class="bg-red-400/15 text-red-400 text-xs font-bold px-2.5 py-1 rounded-lg">
              {{ store.alerts.length }}
            </span>
          </div>
          <p v-if="!store.alerts.length" class="text-sm dark:text-dark-txt2 text-light-txt2 mb-3">
            Sin avisos del sistema. Las notificaciones guardadas aparecerán aquí.
          </p>
          <div class="flex flex-col gap-3">
            <AlertCard
              v-for="alert in store.alerts"
              :key="alert.id"
              :alert="alert"
              @dismiss="store.dismissAlert($event)"
              @action="handleAction" />
          </div>
        </section>
      </div>

      <!-- Presupuesto + consejo dinámico -->
      <div class="lg:col-span-1 flex flex-col gap-4">
        <div class="mw-card">
          <div class="flex justify-between items-center mb-4">
            <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">Presupuesto del periodo</p>
            <p class="text-xs dark:text-dark-txt2 text-light-txt2 tabular-nums">
              {{ formatEuro(store.totalBudgetedSpentThisMonth) }} / {{ formatEuro(store.totalBudget) }}
            </p>
          </div>
          <div class="mb-4">
            <div class="h-2 rounded-full overflow-hidden mb-1 dark:bg-dark-surf bg-light-surf">
              <div
                class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-brand-blue-dark to-brand-blue"
                :style="{ width: budgetPct + '%' }" />
            </div>
            <p class="text-xs text-right dark:text-dark-txt2 text-light-txt2">
              {{ budgetPct }}% utilizado del total presupuestado
            </p>
          </div>
          <div class="max-h-[min(52vh,28rem)] overflow-y-auto pr-1 -mr-1">
            <BudgetBar
              v-for="cat in categoriesWithBudget"
              :key="cat.id ?? cat.name"
              :category="cat" />
            <p v-if="categoriesWithBudget.length === 0" class="text-xs dark:text-dark-txt2 text-light-txt2">
              No hay categorías con tope mensual. Puedes definirlos desde presupuestos o ajustes.
            </p>
          </div>
          <RouterLink
            to="/add"
            class="mt-4 block text-center text-xs font-semibold py-2.5 rounded-xl bg-gradient-to-r from-brand-blue-dark to-brand-blue text-white">
            Registrar movimiento
          </RouterLink>
        </div>

        <div class="mw-card">
          <p class="font-display font-bold text-sm mb-3 dark:text-dark-txt text-light-txt">💡 Consejo según tus datos</p>
          <p class="text-xs leading-relaxed dark:text-dark-txt2 text-light-txt2">
            {{ dynamicTip }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useCurrency } from '@/composables/useCurrency'
import { fiscalYmForDate, monthCycleConfigFromSession } from '@/utils/monthPeriod'
import { formatYearMonthEs } from '@/utils/yearMonthDisplay'
import AlertCard from '@/components/AlertCard.vue'
import BudgetBar from '@/components/BudgetBar.vue'

const store = useWalletStore()
const { formatEuro, formatPct } = useCurrency()

const refreshing = ref(false)

const periodYm = computed(() => fiscalYmForDate(new Date(), monthCycleConfigFromSession(store.user)))
const periodLabel = computed(() => formatYearMonthEs(periodYm.value))

type InsightType = 'danger' | 'warning' | 'success' | 'info'

interface DerivedInsight {
  key: string
  type: InsightType
  badge: string
  title: string
  body: string
  amount: string | null
}

const styleMap: Record<
  InsightType,
  { icon: string; accent: string; iconBg: string; border: string; amount: string; badge: string }
> = {
  danger: {
    icon: '⚠️',
    accent: 'bg-red-400',
    iconBg: 'bg-red-400/10',
    border: 'border-red-400/30',
    amount: 'text-red-400',
    badge: 'bg-red-400/10 text-red-400',
  },
  success: {
    icon: '💡',
    accent: 'bg-brand-green',
    iconBg: 'bg-brand-green/10',
    border: 'border-brand-green/30',
    amount: 'text-brand-green',
    badge: 'bg-brand-green/10 text-brand-green',
  },
  warning: {
    icon: '📈',
    accent: 'bg-brand-gold',
    iconBg: 'bg-brand-gold/10',
    border: 'border-brand-gold/30',
    amount: 'text-brand-gold',
    badge: 'bg-brand-blue/10 text-brand-blue',
  },
  info: {
    icon: 'ℹ️',
    accent: 'bg-brand-blue',
    iconBg: 'bg-brand-blue/10',
    border: 'border-brand-blue/30',
    amount: 'text-brand-blue',
    badge: 'bg-brand-blue/10 text-brand-blue',
  },
}

function styleFor(t: InsightType) {
  return styleMap[t]
}

const categoriesWithBudget = computed(() => store.categories.filter(c => c.budget > 0))

const budgetPct = computed<number>(() => {
  const b = store.totalBudget
  if (b <= 0) return 0
  return Math.min(100, Math.round((store.totalBudgetedSpentThisMonth / b) * 100))
})

const kpiRow = computed(() => [
  {
    label: 'Saldo total',
    value: formatEuro(store.balance),
    colorClass: store.balance >= 0 ? 'dark:text-dark-txt text-light-txt' : 'text-red-400',
  },
  {
    label: 'Ingresos (periodo)',
    value: formatEuro(store.monthIncome),
    colorClass: 'text-brand-green',
  },
  {
    label: 'Gastos (periodo)',
    value: formatEuro(store.monthExpenses),
    colorClass: 'dark:text-dark-txt text-light-txt',
  },
  {
    label: 'Flujo neto',
    value: formatEuro(store.monthNetCashflow, true),
    colorClass: store.monthNetCashflow >= 0 ? 'text-brand-green' : 'text-red-400',
  },
])

const derivedInsights = computed<DerivedInsight[]>(() => {
  const out: DerivedInsight[] = []

  const over = store.categories
    .filter(c => c.budget > 0 && c.spentThisMonth > c.budget)
    .sort((a, b) => b.spentThisMonth - b.budget - (a.spentThisMonth - a.budget))

  if (over.length) {
    const excess = over.reduce((s, c) => s + Math.max(0, c.spentThisMonth - c.budget), 0)
    const body =
      over.length === 1
        ? `Gasto ${formatEuro(over[0]!.spentThisMonth)} frente a ${formatEuro(over[0]!.budget)} asignados.`
        : over
            .slice(0, 4)
            .map(c => `${c.icon} ${c.name}: +${formatEuro(c.spentThisMonth - c.budget)}`)
            .join(' · ')
    out.push({
      key: 'over-budget',
      type: 'danger',
      badge: 'Presupuesto',
      title:
        over.length === 1
          ? `${over[0]!.icon} ${over[0]!.name} supera el tope`
          : `${over.length} categorías por encima del presupuesto`,
      body: over.length > 4 ? `${body}…` : body,
      amount: `Exceso acumulado ${formatEuro(excess)}`,
    })
  }

  const near = store.categories.filter(c => {
    if (c.budget <= 0) return false
    if (c.spentThisMonth > c.budget) return false
    const r = c.spentThisMonth / c.budget
    return r >= 0.85
  })
  if (near.length) {
    out.push({
      key: 'near-limit',
      type: 'warning',
      badge: 'Límite',
      title: `${near.length} categoría(s) al 85% o más del tope`,
      body: near
        .slice(0, 5)
        .map(c => `${c.icon} ${c.name} (${formatPct((100 * c.spentThisMonth) / c.budget)})`)
        .join(', '),
      amount: null,
    })
  }

  const avg = store.yearlyAverageExpense
  const monthsWithExpense = store.expenseMonthsWithData
  const cur = store.monthExpenses
  if (avg >= 0.01 && cur > 0 && monthsWithExpense >= 1) {
    const ratio = cur / avg
    if (ratio >= 1.12) {
      const mesesLabel = monthsWithExpense === 1 ? '1 mes con gasto' : `${monthsWithExpense} meses con gasto`
      out.push({
        key: 'above-avg',
        type: 'warning',
        badge: 'Tendencia',
        title: 'Gasto del periodo por encima de tu media',
        body: `Este periodo llevas ${formatEuro(cur)}. Tu media mensual de gasto en la ventana móvil es ${formatEuro(avg)} (${mesesLabel}, misma regla que en Estadísticas).`,
        amount: `+${formatPct((ratio - 1) * 100)} vs media`,
      })
    } else if (ratio <= 0.88) {
      out.push({
        key: 'below-avg',
        type: 'success',
        badge: 'Control',
        title: 'Gasto contenido respecto a la media',
        body: `Has registrado ${formatEuro(cur)} frente a la media de ${formatEuro(avg)} (${monthsWithExpense} mes${monthsWithExpense === 1 ? '' : 'es'} con gasto en la ventana móvil).`,
        amount: `${formatPct((1 - ratio) * 100)} por debajo`,
      })
    }
  }

  if (store.monthNetCashflow < 0 && store.monthExpenses > 0) {
    out.push({
      key: 'negative-net',
      type: 'warning',
      badge: 'Flujo',
      title: 'Flujo neto negativo en este periodo',
      body: `Ingresos ${formatEuro(store.monthIncome)} y gastos ${formatEuro(store.monthExpenses)}.`,
      amount: formatEuro(store.monthNetCashflow, true),
    })
  }

  const snap = store.statementSnapshot
  if (snap != null && (snap.firstDate != null || snap.lastDate != null)) {
    out.push({
      key: 'statement',
      type: 'info',
      badge: 'Extracto',
      title: 'Último extracto importado',
      body: `Saldo de ${formatEuro(snap.openingSaldo)} a ${formatEuro(snap.closingSaldo)} en el periodo del Excel.`,
      amount: formatEuro(snap.delta, true),
    })
  }

  if (store.balance < 0) {
    out.unshift({
      key: 'balance-negative',
      type: 'danger',
      badge: 'Saldo',
      title: 'Saldo agregado negativo',
      body: 'Revisa cuentas y movimientos pendientes de categorizar o importar.',
      amount: formatEuro(store.balance, true),
    })
  }

  return out
})

const dynamicTip = computed(() => {
  const over = store.categories.filter(c => c.budget > 0 && c.spentThisMonth > c.budget)
  if (over.length) {
    const names = over
      .slice(0, 2)
      .map(c => c.name)
      .join(' y ')
    const extra = over.length > 2 ? ` (+${over.length - 2})` : ''
    return `Prioriza recortar o replanificar ${names}${extra}. Ajusta el tope solo si el gasto fue necesario y recurrente.`
  }

  const near = store.categories.filter(c => {
    if (c.budget <= 0) return false
    if (c.spentThisMonth > c.budget) return false
    return c.spentThisMonth / c.budget >= 0.85
  })
  if (near.length) {
    return `Varias categorías rozan el límite. Un repaso de fin de semana en movimientos suele evitar sorpresas de cierre de mes.`
  }

  const avg = store.yearlyAverageExpense
  const cur = store.monthExpenses
  const mwd = store.expenseMonthsWithData
  if (avg >= 0.01 && cur > 0 && mwd >= 1 && cur / avg >= 1.12) {
    return `Vas por encima de tu media de gasto (últimos 12 meses con datos): fija un tope semanal o aplaza compras no urgentes hasta ver el cierre del periodo.`
  }

  if (store.monthNetCashflow < 0) {
    return `El neto del periodo es negativo: equilibra con más ingresos o menos gasto variable antes de que cierre el ciclo fiscal.`
  }

  if (avg >= 0.01 && cur > 0 && mwd >= 1 && cur / avg <= 0.88) {
    return `Por debajo de tu media: buen momento para asignar un colchón o un objetivo de ahorro explícito.`
  }

  return 'Presupuestos y flujo se ven equilibrados. Sigue revisando movimientos con regularidad para mantener la tendencia.'
})

async function refresh(): Promise<void> {
  refreshing.value = true
  try {
    await Promise.all([store.loadDashboard(), store.loadBudgets(), store.loadAlerts()])
  } finally {
    refreshing.value = false
  }
}

onMounted(() => {
  void refresh()
})

async function handleAction(payload: { alertId: number | string }): Promise<void> {
  await store.dismissAlert(payload.alertId)
}
</script>
