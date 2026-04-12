<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="font-display font-extrabold text-lg dark:text-dark-txt text-light-txt">Estadísticas</h2>
        <p class="mt-0.5 text-xs dark:text-dark-txt2 text-light-txt2">
          Elige el mes: un solo endpoint carga gasto por categoría, presupuestos del mes y las 12 barras del año.
        </p>
      </div>
      <p v-if="statsError" class="rounded-xl border border-red-400/40 px-3 py-2 text-xs text-red-400 dark:bg-dark-surf">
        {{ statsError }}
      </p>
    </div>

    <!-- Meses recientes (scroll horizontal) -->
    <div class="mb-6 flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="chip in monthChips"
        :key="chip.ym"
        type="button"
        :class="[
          'flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
          selectedYm === chip.ym
            ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
            : 'border-brand-blue/10 bg-light-card text-light-txt2 dark:border-white/[0.07] dark:bg-dark-card dark:text-dark-txt2',
        ]"
        @click="selectedYm = chip.ym"
      >
        {{ chip.label }}
      </button>
    </div>

    <div
      :class="[
        'grid grid-cols-1 gap-4 transition-opacity md:gap-6 lg:grid-cols-3',
        statsLoading ? 'pointer-events-none opacity-50' : '',
      ]"
    >
      <!-- Donut: gasto del mes por categoría -->
      <div class="mw-card lg:col-span-1">
        <p class="mb-1 text-xs font-semibold dark:text-dark-txt text-light-txt">Distribución del mes</p>
        <p class="mb-4 text-[10px] dark:text-dark-txt2 text-light-txt2">{{ selectedMonthLabel }}</p>
        <div v-if="statsDonutSegments.length === 0" class="py-8 text-center text-sm dark:text-dark-txt2 text-light-txt2">
          Sin gasto registrado por categoría en este mes.
        </div>
        <DonutChart v-else :segments="statsDonutSegments" :center-label="donutCenterLabel" />
      </div>

      <!-- Barras: 12 meses del año del mes seleccionado (el gráfico crece con la altura de la fila del grid) -->
      <div class="mw-card flex h-full min-h-[16rem] flex-col md:col-span-2 lg:col-span-2">
        <p class="mb-1 shrink-0 text-xs font-semibold dark:text-dark-txt text-light-txt">Gasto mensual</p>
        <p class="mb-3 shrink-0 text-[10px] dark:text-dark-txt2 text-light-txt2">Año {{ chartYear }} · el mes actual del sistema se resalta si cae en este año; el mes elegido lleva anillo ámbar</p>
        <div class="min-h-0 flex-1">
          <BarChart class="h-full min-h-[10rem]" :bars="chartBars" :max-val="barMaxVal" />
        </div>
      </div>

      <!-- KPIs -->
      <div class="mw-card">
        <p class="mb-1 text-xs dark:text-dark-txt2 text-light-txt2">Promedio mensual (año {{ chartYear }})</p>
        <p class="font-display text-2xl font-extrabold dark:text-dark-txt text-light-txt md:text-3xl">
          {{ formatEuro(yearlyAverageExpense, false) }}
        </p>
        <p v-if="comparisonHint" class="mt-2 text-[10px] leading-snug dark:text-dark-txt3 text-light-txt3">
          {{ comparisonHint }}
        </p>
        <p v-else class="mt-2 text-[10px] dark:text-dark-txt3 text-light-txt3">Compara la media de la primera mitad del año con la segunda (al menos 4 meses con datos).</p>
      </div>

      <div class="mw-card">
        <p class="mb-1 text-xs dark:text-dark-txt2 text-light-txt2">Mes con menos gasto</p>
        <p class="font-display text-2xl font-extrabold dark:text-dark-txt text-light-txt md:text-3xl">
          {{ formatEuro(bestMonthAmount, false) }}
        </p>
        <p class="mt-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ bestMonthYearLabel }}</p>
      </div>

      <div class="mw-card">
        <p class="mb-1 text-xs dark:text-dark-txt2 text-light-txt2">Gasto del mes (suma categorías)</p>
        <p class="font-display text-2xl font-extrabold dark:text-dark-txt text-light-txt md:text-3xl">
          {{ formatEuro(statsMonthSpendTotal, false) }}
        </p>
        <p class="mt-1 text-xs dark:text-dark-txt2 text-light-txt2">
          Presupuesto total asignado: {{ formatEuro(monthBudgetTotal, false) }}
        </p>
      </div>

      <!-- Desglose -->
      <div class="mw-card md:col-span-2 lg:col-span-3">
        <p class="mb-1 font-display text-sm font-bold dark:text-dark-txt text-light-txt">Desglose por categoría</p>
        <p class="mb-4 text-[10px] dark:text-dark-txt2 text-light-txt2">
          Gasto del mes frente al presupuesto · {{ selectedMonthLabel }}
        </p>
        <div class="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="cat in categoriesForBreakdown" :key="cat.id">
            <div class="mb-1.5 flex justify-between gap-2">
              <span class="text-xs font-medium dark:text-dark-txt2 text-light-txt2">{{ cat.icon }} {{ cat.name }}</span>
              <span class="text-xs font-bold tabular-nums dark:text-dark-txt text-light-txt">
                {{ categoryStatsLine(cat) }}
              </span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full dark:bg-dark-surf bg-light-surf">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: budgetBarWidth(cat), background: cat.color }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { api, type StatsMonthOverviewDto, type StatsMonthCategoryDto } from '@/services/api'
import { useCurrency } from '@/composables/useCurrency'
import { useWalletStore, type DonutSegment, type MonthlyData } from '@/stores/wallet'
import { fiscalYmForDate, monthCycleConfigFromSession } from '@/utils/monthPeriod'
import DonutChart from '@/components/DonutChart.vue'
import BarChart from '@/components/BarChart.vue'

const { formatEuro, roundMoney } = useCurrency()
const wallet = useWalletStore()

function defaultSelectedYm(): string {
  return fiscalYmForDate(new Date(), monthCycleConfigFromSession(wallet.user))
}

const monthShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const

/** Últimos 18 meses, cronológicos (izquierda más antiguo). */
function recentMonthChips(count: number): { ym: string; label: string }[] {
  const now = new Date()
  const arr: { ym: string; label: string }[] = []
  for (let k = -(count - 1); k <= 0; k++) {
    const x = new Date(now.getFullYear(), now.getMonth() + k, 1)
    const ym = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
    arr.push({
      ym,
      label: `${monthShort[x.getMonth()]} ${x.getFullYear()}`,
    })
  }
  return arr
}

const monthChips = recentMonthChips(18)
const selectedYm = ref(defaultSelectedYm())

const overview = ref<StatsMonthOverviewDto | null>(null)
const statsLoading = ref(false)
const statsError = ref<string | null>(null)

async function loadOverview(ym: string): Promise<void> {
  statsLoading.value = true
  statsError.value = null
  try {
    overview.value = await api.getStatsMonthOverview(ym)
  } catch (e: unknown) {
    statsError.value =
      e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
        ? (e as { message: string }).message
        : 'No se pudieron cargar las estadísticas.'
    overview.value = null
  } finally {
    statsLoading.value = false
  }
}

watch(selectedYm, (ym) => {
  void loadOverview(ym)
})

watch(
  () => [
    wallet.user?.monthCycleMode,
    wallet.user?.monthCycleStartDay,
    wallet.user?.monthCycleEndDay,
    wallet.user?.monthCycleAnchor,
  ],
  () => {
    selectedYm.value = defaultSelectedYm()
    void loadOverview(selectedYm.value)
  }
)

onMounted(() => {
  void loadOverview(selectedYm.value)
})

const chartYear = computed(() => parseInt(selectedYm.value.split('-')[0]!, 10))

const selectedMonthLabel = computed(() => {
  const hit = monthChips.find(c => c.ym === selectedYm.value)
  return hit?.label ?? selectedYm.value
})

const chartBars = computed<MonthlyData[]>(() => {
  const o = overview.value
  if (!o) return []
  return o.monthlyBars.map(b => ({
    month: b.label,
    amount: b.expenses,
    current: b.isCurrentSystemMonth,
    selected: b.isSelectedMonth,
    income: b.income,
    net: b.net,
  }))
})

const barMaxVal = computed(() => Math.max(...chartBars.value.map(b => b.amount), 1))

const yearlyAverageExpense = computed(() => roundMoney(overview.value?.totals.yearlyAverageExpense ?? 0))
const bestMonthAmount = computed(() => roundMoney(overview.value?.totals.bestMonthAmount ?? 0))
const monthBudgetTotal = computed(() => roundMoney(overview.value?.totals.monthBudgetTotal ?? 0))

const statsMonthSpendTotal = computed(() => roundMoney(overview.value?.totals.monthExpenseTotal ?? 0))

const statsDonutSegments = computed<DonutSegment[]>(() => {
  const rows = overview.value?.categories.filter(c => roundMoney(c.spent) > 0) ?? []
  const total = rows.reduce((s, c) => s + roundMoney(c.spent), 0)
  if (total <= 0) return []
  const circumference = 2 * Math.PI * 36
  let offset = 0
  return rows.map(cat => {
    const amt = roundMoney(cat.spent)
    const pct = amt / total
    const dash = pct * circumference
    const seg: DonutSegment = {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      budget: roundMoney(cat.budget),
      spent: amt,
      spentThisMonth: amt,
      incomeInCategory: roundMoney(cat.incomeInCategory),
      categoryType: 'expense',
      pct: Math.round(pct * 100),
      dash,
      offset,
    }
    offset += dash
    return seg
  })
})

const donutCenterLabel = computed(() => {
  const t = statsMonthSpendTotal.value
  const s = t.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `€${s}`
})

const categoriesForBreakdown = computed(() =>
  (overview.value?.categories ?? []).filter(
    c => roundMoney(c.budget) > 0 || roundMoney(c.spent) > 0 || roundMoney(c.incomeInCategory) > 0
  )
)

function categoryStatsLine(cat: StatsMonthCategoryDto): string {
  const g = roundMoney(cat.spent)
  const inc = roundMoney(cat.incomeInCategory)
  const b = roundMoney(cat.budget)
  const parts = [g > 0 ? formatEuro(g, false) : null, inc > 0 ? formatEuro(inc, true) : null].filter(Boolean)
  const left = parts.length ? parts.join(' · ') : formatEuro(0, false)
  return `${left} / ${formatEuro(b, false)}`
}

function budgetBarWidth(cat: StatsMonthCategoryDto): string {
  const b = roundMoney(cat.budget)
  if (b <= 0) return '0%'
  return `${Math.min(100, Math.round((roundMoney(cat.spent) / b) * 100))}%`
}

const bestMonthYearLabel = computed(() => {
  const label = overview.value?.totals.bestMonthLabel
  if (!label) return '—'
  return `${label} ${chartYear.value}`
})

/** Compara media de gasto 1ª mitad del año vs 2ª mitad (mismos datos que las barras). */
const comparisonHint = computed<string | null>(() => {
  const arr = chartBars.value
  if (arr.length < 4) return null
  const mid = Math.floor(arr.length / 2)
  const first = arr.slice(0, mid)
  const second = arr.slice(mid)
  const a1 = first.reduce((s, m) => s + m.amount, 0) / first.length
  const a2 = second.reduce((s, m) => s + m.amount, 0) / second.length
  if (a1 <= 0 && a2 <= 0) return null
  if (a1 <= 0) return null
  const pct = Math.round(((a2 - a1) / a1) * 1000) / 10
  if (Math.abs(pct) < 0.5) return 'Gasto medio muy similar entre la primera y la segunda mitad del año.'
  if (pct < 0) return `Segunda mitad del año: ${Math.abs(pct)}% menos de gasto medio mensual que la primera.`
  return `Segunda mitad del año: ${pct}% más de gasto medio mensual que la primera.`
})
</script>
