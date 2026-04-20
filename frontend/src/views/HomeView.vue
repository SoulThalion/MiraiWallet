<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <div class="rounded-3xl p-5 md:p-7 mb-6 relative overflow-hidden dark:bg-gradient-to-br dark:from-[#091A30] dark:to-dark-card bg-gradient-to-br from-[#D8E8FA] to-light-card border border-brand-blue/10 dark:border-0">
      <div class="absolute -top-12 -right-12 w-56 h-56 rounded-full pointer-events-none"
           :style="{ background: 'radial-gradient(circle, rgba(0,71,204,0.14) 0%, transparent 70%)' }"></div>

      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
        <div>
          <p class="text-sm dark:text-dark-txt2 text-light-txt2">{{ t('home.welcomeBack') }}</p>
          <p class="font-display font-black text-2xl md:text-3xl mt-0.5 dark:text-dark-txt text-light-txt">
            {{ store.userDisplayName }} 👋
          </p>
          <p v-if="statementLine" class="text-xs mt-1 dark:text-dark-txt2 text-light-txt2">
            {{ statementLine }}
          </p>
        </div>
        <div class="rounded-2xl p-4 md:p-5 min-w-[200px] relative overflow-hidden dark:bg-dark-surf bg-white/80 border border-brand-blue/10 dark:border-0">
          <p class="text-[10px] uppercase tracking-widest mb-1 dark:text-dark-txt2 text-light-txt2">{{ t('home.totalBalance') }}</p>
          <p class="font-display font-black text-3xl md:text-4xl tracking-tight dark:text-dark-txt text-light-txt">
            <span class="text-lg font-semibold mr-0.5 dark:text-dark-txt2 text-light-txt2">€</span>
            {{ balanceParts.intPart }}<span class="text-lg font-semibold dark:text-dark-txt2 text-light-txt2">,{{ balanceParts.decPart }}</span>
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mt-4 relative z-10">
        <div v-for="stat in homeKpis" :key="stat.label"
             class="rounded-xl p-3 dark:bg-dark-surf bg-white/70 border border-brand-blue/10 dark:border-0">
          <p class="text-[10px] md:text-xs dark:text-dark-txt2 text-light-txt2">{{ stat.label }}</p>
          <p :class="['text-sm md:text-base font-bold mt-1', stat.color]">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <div class="mw-card lg:col-span-1">
        <div class="mb-3 flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5">
            <p class="font-display font-extrabold text-sm dark:text-dark-txt text-light-txt">{{ t('home.budgetHealth') }}</p>
            <InfoTip :text="t('home.budgetHealthInfo')" :aria-label="t('home.budgetHealthInfo')" />
          </div>
          <RouterLink to="/budgets" class="text-xs text-brand-blue">{{ t('home.viewAll') }} →</RouterLink>
        </div>
        <div class="h-2 rounded-full overflow-hidden mb-2 dark:bg-dark-surf bg-light-surf">
          <div
            class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-brand-blue-dark to-brand-blue"
            :style="{ width: `${Math.min(100, store.totalBudgetUsagePct)}%` }"
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs dark:text-dark-txt2 text-light-txt2">
            {{ t('home.usedBudgetPercent', { pct: store.totalBudgetUsagePct }) }}
          </p>
          <span :class="['text-[11px] font-bold', budgetStatusClass]">{{ budgetStatusLabel }}</span>
        </div>
        <p class="mt-2 text-xs tabular-nums dark:text-dark-txt2 text-light-txt2">
          {{ formatEuro(store.totalBudgetedSpentThisMonth, false) }} / {{ formatEuro(store.totalBudget, false) }}
        </p>
      </div>

      <div class="mw-card lg:col-span-1">
        <div class="mb-3 flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5">
            <p class="font-display font-extrabold text-sm dark:text-dark-txt text-light-txt">{{ t('home.paceHealth') }}</p>
            <InfoTip :text="t('home.paceHealthInfo')" :aria-label="t('home.paceHealthInfo')" />
          </div>
          <RouterLink to="/stats" class="text-xs text-brand-blue">{{ t('home.viewAll') }} →</RouterLink>
        </div>
        <p class="text-[11px] dark:text-dark-txt2 text-light-txt2">
          {{ t('home.paceDaysProgress', { elapsed: paceDaysElapsed, total: paceDaysTotal, pct: paceProgressPct }) }}
        </p>
        <div class="mt-2 space-y-2">
          <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
            <p class="font-semibold dark:text-dark-txt text-light-txt">{{ t('home.paceWeighted') }}</p>
            <p class="mt-1 text-[11px] dark:text-dark-txt2 text-light-txt2">
              <span :class="['font-semibold', paceStatusClass(paceWeightedStatus)]">{{ paceStatusLabel(t, 'stats', paceWeightedStatus, pacePctWeighted, paceActualSpent, paceExpectedWeighted) }}</span>
              <span> · {{ paceExplain(paceActualSpent, paceExpectedWeighted) }}</span>
            </p>
          </div>
          <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
            <p class="font-semibold dark:text-dark-txt text-light-txt">{{ t('home.paceLinear') }}</p>
            <p class="mt-1 text-[11px] dark:text-dark-txt2 text-light-txt2">
              <span :class="['font-semibold', paceStatusClass(paceLinearStatus)]">{{ paceStatusLabel(t, 'stats', paceLinearStatus, pacePctLinear, paceActualSpent, paceExpectedLinear) }}</span>
              <span> · {{ paceExplain(paceActualSpent, paceExpectedLinear) }}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="mw-card lg:col-span-1">
        <div class="mb-3 flex items-center justify-between gap-2">
          <p class="font-display font-extrabold text-sm dark:text-dark-txt text-light-txt">{{ t('home.alertsSummary') }}</p>
          <RouterLink to="/alerts" class="text-xs text-brand-blue">{{ t('home.viewAll') }} →</RouterLink>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-xl p-2 border dark:border-white/[0.08] border-brand-blue/10">
            <p class="text-[10px] dark:text-dark-txt2 text-light-txt2">{{ t('home.alertsCritical') }}</p>
            <p class="text-base font-bold text-red-400">{{ homeAlertsSummary.danger }}</p>
          </div>
          <div class="rounded-xl p-2 border dark:border-white/[0.08] border-brand-blue/10">
            <p class="text-[10px] dark:text-dark-txt2 text-light-txt2">{{ t('home.alertsWarning') }}</p>
            <p class="text-base font-bold text-amber-500">{{ homeAlertsSummary.warning }}</p>
          </div>
          <div class="rounded-xl p-2 border dark:border-white/[0.08] border-brand-blue/10">
            <p class="text-[10px] dark:text-dark-txt2 text-light-txt2">{{ t('home.alertsInfo') }}</p>
            <p class="text-base font-bold text-brand-blue">{{ homeAlertsSummary.info }}</p>
          </div>
          <div class="rounded-xl p-2 border dark:border-white/[0.08] border-brand-blue/10">
            <p class="text-[10px] dark:text-dark-txt2 text-light-txt2">{{ t('home.alertsTotal') }}</p>
            <p class="text-base font-bold dark:text-dark-txt text-light-txt">{{ homeAlertsSummary.total }}</p>
          </div>
        </div>
      </div>

      <div class="mw-card md:col-span-2 lg:col-span-3">
        <div class="mb-4 flex items-center justify-between gap-2">
          <p class="font-display font-extrabold text-sm dark:text-dark-txt text-light-txt">{{ t('home.quickActions') }}</p>
          <p class="text-[10px] dark:text-dark-txt2 text-light-txt2">{{ t('home.quickActionsHint') }}</p>
        </div>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
          <RouterLink
            v-for="action in quickActions"
            :key="action.key"
            :to="action.to"
            class="group rounded-xl border p-3 transition-colors dark:bg-dark-surf dark:border-white/[0.08] dark:hover:border-brand-blue/35 dark:hover:bg-white/[0.03] bg-light-surf border-brand-blue/10 hover:border-brand-blue/35 hover:bg-brand-blue/[0.03]"
          >
            <div class="flex items-center gap-3">
              <span
                class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base"
                :class="action.iconWrapClass"
              >
                {{ action.icon }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold dark:text-dark-txt text-light-txt">{{ action.title }}</p>
                <p class="text-[11px] dark:text-dark-txt2 text-light-txt2">{{ action.subtitle }}</p>
              </div>
              <span
                v-if="action.badge != null"
                class="rounded-md px-2 py-0.5 text-[10px] font-bold"
                :class="action.badgeClass"
              >
                {{ action.badge }}
              </span>
            </div>
          </RouterLink>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWalletStore } from '@/stores/wallet'
import { useCurrency } from '@/composables/useCurrency'
import type { BudgetPaceStatus } from '@/services/api'
import InfoTip from '@/components/InfoTip.vue'
import { paceStatusClass, paceStatusLabel } from '@/composables/usePaceStatus'

interface BalanceStat {
  label: string
  value: string
  color: string
}

interface QuickAction {
  key: string
  to: string
  icon: string
  title: string
  subtitle: string
  iconWrapClass: string
  badge?: string | null
  badgeClass?: string
}

const store = useWalletStore()
const { t, locale } = useI18n()
const { formatEuro, formatDateOnlyEs, roundMoney } = useCurrency()

const balanceParts = computed(() => {
  const [intStr, decStr] = store.balance.toFixed(2).split('.')
  const numberLocale = locale.value === 'en' ? 'en-US' : locale.value === 'de' ? 'de-DE' : 'es-ES'
  return {
    intPart: parseInt(intStr, 10).toLocaleString(numberLocale),
    decPart: decStr,
  }
})

const statementLine = computed(() => {
  const s = store.statementSnapshot
  if (!s) return ''
  const df = formatDateOnlyEs(s.firstDate)
  const dt = formatDateOnlyEs(s.lastDate)
  const range = df && dt ? `${df} – ${dt}` : ''
  return range
    ? t('home.lastStatementWithRange', { range, amount: formatEuro(s.delta, true) })
    : t('home.lastStatement', { amount: formatEuro(s.delta, true) })
})

const budgetStatusLabel = computed(() => {
  if (store.totalBudgetUsagePct >= 100) return t('home.statusCritical')
  if (store.totalBudgetUsagePct >= 85) return t('home.statusWarning')
  return t('home.statusOk')
})

const budgetStatusClass = computed(() => {
  if (store.totalBudgetUsagePct >= 100) return 'text-red-500'
  if (store.totalBudgetUsagePct >= 85) return 'text-amber-500'
  return 'text-brand-green'
})

const paceDaysElapsed = computed(() => store.budgetPace?.daysElapsed ?? 0)
const paceDaysTotal = computed(() => store.budgetPace?.daysTotal ?? 0)
const paceProgressPct = computed(() => Number((store.budgetPace?.periodProgressPct ?? 0).toFixed(1)))
const pacePctLinear = computed(() => store.budgetPace?.pacePctLinear ?? 0)
const pacePctWeighted = computed(() => store.budgetPace?.pacePctWeighted ?? 0)
const paceActualSpent = computed(() => Number(store.budgetPace?.actualSpent ?? 0))
const paceExpectedLinear = computed(() => Number(store.budgetPace?.expectedSpentLinear ?? 0))
const paceExpectedWeighted = computed(() => Number(store.budgetPace?.expectedSpentWeighted ?? 0))
const paceLinearStatus = computed<BudgetPaceStatus>(() => store.budgetPace?.statusLinear ?? 'ok')
const paceWeightedStatus = computed<BudgetPaceStatus>(() => store.budgetPace?.statusWeighted ?? 'ok')
const paceAsOfDayMonth = computed(() => {
  const raw = String(store.budgetPace?.asOfDate ?? '')
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (!m) return '--/--'
  return `${m[3]}/${m[2]}`
})

function paceExplain(actualSpent: number, expectedSpent: number): string {
  const diffPct = expectedSpent > 0 ? ((actualSpent - expectedSpent) / expectedSpent) * 100 : 0
  const pct = Math.abs(diffPct).toFixed(1)
  const dayMonth = paceAsOfDayMonth.value
  if (actualSpent > expectedSpent) return t('home.paceExplainAbove', { pct, dayMonth })
  if (actualSpent < expectedSpent) return t('home.paceExplainBelow', { pct, dayMonth })
  return t('home.paceExplainOnTrack', { dayMonth })
}

const homeKpis = computed<BalanceStat[]>(() => {
  const net = store.monthNetCashflow
  return [
    { label: t('home.periodIncome'), value: formatEuro(store.monthIncome, true), color: 'text-brand-green' },
    { label: t('home.periodExpenses'), value: formatEuro(-store.monthExpenses, true), color: 'text-red-400' },
    {
      label: t('home.periodNet'),
      value: formatEuro(net, true),
      color: net >= 0 ? 'text-brand-green' : 'text-red-400',
    },
    {
      label: t('home.budgetUsedKpi'),
      value: `${store.totalBudgetUsagePct}%`,
      color: store.totalBudgetUsagePct >= 100 ? 'text-red-500' : store.totalBudgetUsagePct >= 85 ? 'text-amber-500' : 'text-brand-green',
    },
  ]
})

const homeAlertsSummary = computed(() => {
  const out = { danger: 0, warning: 0, info: 0, success: 0, total: 0 }

  for (const a of store.alerts) {
    if (a.type === 'danger') out.danger += 1
    else if (a.type === 'warning') out.warning += 1
    else if (a.type === 'info') out.info += 1
    else if (a.type === 'success') out.success += 1
  }

  const pace = store.budgetPace
  if (pace) {
    if (pace.statusWeighted === 'critical') out.danger += 1
    else if (pace.statusWeighted === 'risk' || pace.statusWeighted === 'warn') out.warning += 1
    if (pace.statusLinear === 'critical') out.danger += 1
    else if (pace.statusLinear === 'risk' || pace.statusLinear === 'warn') out.warning += 1
  }

  const overBudget = store.categories.filter(c => c.budget > 0 && c.spentThisMonth > c.budget)
  if (overBudget.length) out.danger += 1

  const nearLimit = store.categories.filter(c => c.budget > 0 && c.spentThisMonth <= c.budget && c.spentThisMonth / c.budget >= 0.85)
  if (nearLimit.length) out.warning += 1

  const avg = store.yearlyAverageExpense
  const cur = store.monthExpenses
  const mwd = store.expenseMonthsWithData
  if (avg >= 0.01 && cur > 0 && mwd >= 1 && cur / avg >= 1.12) out.warning += 1
  else if (avg >= 0.01 && cur > 0 && mwd >= 1 && cur / avg <= 0.88) out.success += 1

  if (store.monthNetCashflow < 0 && store.monthExpenses > 0) out.warning += 1
  if (store.statementSnapshot && (store.statementSnapshot.firstDate || store.statementSnapshot.lastDate)) out.info += 1
  if (store.balance < 0) out.danger += 1

  out.total = out.danger + out.warning + out.info + out.success
  return out
})

const quickActions = computed<QuickAction[]>(() => [
  {
    key: 'add',
    to: '/add',
    icon: '➕',
    title: t('nav.addExpense'),
    subtitle: t('home.quickAddSubtitle'),
    iconWrapClass: 'bg-brand-blue text-white',
  },
  {
    key: 'alerts',
    to: '/alerts',
    icon: '🔔',
    title: t('nav.alerts'),
    subtitle: t('home.quickAlertsSubtitle'),
    iconWrapClass: 'bg-red-500/15 text-red-400',
    badge: String(homeAlertsSummary.value.total),
    badgeClass: homeAlertsSummary.value.total > 0 ? 'bg-red-500/15 text-red-400' : 'bg-brand-blue/10 text-brand-blue',
  },
  {
    key: 'stats',
    to: '/stats',
    icon: '📊',
    title: t('home.viewStats'),
    subtitle: t('home.quickStatsSubtitle'),
    iconWrapClass: 'bg-brand-blue/15 text-brand-blue',
  },
  {
    key: 'budgets',
    to: '/budgets',
    icon: '🎯',
    title: t('nav.budgets'),
    subtitle: t('home.quickBudgetsSubtitle'),
    iconWrapClass: 'bg-amber-500/15 text-amber-500',
    badge: `${store.totalBudgetUsagePct}%`,
    badgeClass: store.totalBudgetUsagePct >= 100
      ? 'bg-red-500/15 text-red-500'
      : store.totalBudgetUsagePct >= 85
        ? 'bg-amber-500/15 text-amber-500'
        : 'bg-brand-green/15 text-brand-green',
  },
])

</script>
