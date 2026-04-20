<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-2xl mx-auto">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <p class="font-display text-lg font-bold dark:text-dark-txt text-light-txt">{{ t('nav.forecast') }}</p>
        <p class="mt-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('forecast.subtitle') }}</p>
      </div>
      <div class="flex flex-shrink-0 flex-col items-stretch gap-2 sm:items-end">
        <p v-if="forecastError" class="max-w-sm rounded-xl border border-red-400/40 px-3 py-2 text-xs text-red-400 dark:bg-dark-surf">
          {{ forecastError }}
        </p>
        <MwMonthStepper
          v-model="selectedForecastYm"
          allow-future
          max-ym="2099-12"
          :prev-aria-label="t('dateRange.prevMonth')"
          :next-aria-label="t('dateRange.nextMonth')"
        />
      </div>
    </div>

    <div :class="['space-y-6 transition-opacity', forecastLoading ? 'pointer-events-none opacity-50' : '']">
      <div v-if="forecastMain" class="mw-card">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <p class="font-display text-sm font-bold dark:text-dark-txt text-light-txt">{{ t('stats.recurringDueTitle') }}</p>
              <InfoTip :text="t('stats.recurringDueInfo')" :aria-label="t('stats.recurringDueInfo')" />
            </div>
            <p class="mt-1 text-[10px] dark:text-dark-txt3 text-light-txt3">
              {{ t('forecast.autoPatternCount', { count: recurringAutoPatternCount }) }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(9.5rem,12.5rem)] lg:items-start">
          <div class="min-w-0 rounded-xl border p-3 dark:border-white/[0.08] border-brand-blue/10">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <div class="flex items-center gap-1.5">
                  <p class="text-xs font-semibold dark:text-dark-txt text-light-txt">{{ t('stats.recurringCalendarTitle') }}</p>
                  <InfoTip :text="t('stats.recurringCalendarInfo')" :aria-label="t('stats.recurringCalendarInfo')" />
                </div>
                <div
                  class="inline-flex shrink-0 rounded-lg border p-0.5 dark:border-white/[0.08] border-brand-blue/15"
                  role="group"
                >
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
                    :class="
                      calendarMode === 'recurring'
                        ? 'bg-brand-blue/15 text-brand-blue dark:bg-brand-blue/25 dark:text-brand-blue'
                        : 'dark:text-dark-txt2 text-light-txt2 hover:text-brand-blue'
                    "
                    :aria-pressed="calendarMode === 'recurring'"
                    @click="setCalendarMode('recurring')"
                  >
                    {{ t('forecast.calendarRecurringOnly') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
                    :class="
                      calendarMode === 'all'
                        ? 'bg-brand-blue/15 text-brand-blue dark:bg-brand-blue/25 dark:text-brand-blue'
                        : 'dark:text-dark-txt2 text-light-txt2 hover:text-brand-blue'
                    "
                    :aria-pressed="calendarMode === 'all'"
                    @click="setCalendarMode('all')"
                  >
                    {{ t('forecast.calendarAllMovements') }}
                  </button>
                </div>
                <div
                  class="inline-flex shrink-0 rounded-lg border p-0.5 dark:border-white/[0.08] border-brand-blue/15"
                  role="group"
                >
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
                    :class="
                      calendarPeriod === 'month'
                        ? 'bg-brand-blue/15 text-brand-blue dark:bg-brand-blue/25 dark:text-brand-blue'
                        : 'dark:text-dark-txt2 text-light-txt2 hover:text-brand-blue'
                    "
                    :aria-pressed="calendarPeriod === 'month'"
                    @click="setCalendarPeriod('month')"
                  >
                    {{ t('forecast.calendarMonthView') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
                    :class="
                      calendarPeriod === 'week'
                        ? 'bg-brand-blue/15 text-brand-blue dark:bg-brand-blue/25 dark:text-brand-blue'
                        : 'dark:text-dark-txt2 text-light-txt2 hover:text-brand-blue'
                    "
                    :aria-pressed="calendarPeriod === 'week'"
                    @click="setCalendarPeriod('week')"
                  >
                    {{ t('forecast.calendarWeekView') }}
                  </button>
                </div>
              </div>
              <div
                v-if="calendarPeriod === 'month'"
                class="text-[10px] font-medium tabular-nums dark:text-dark-txt2 text-light-txt2"
              >
                {{ t('stats.recurringCalendarMonthLabel', { ym: calendarMainYm }) }}
              </div>
              <div v-else class="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-blue/20 text-brand-blue transition-colors hover:bg-brand-blue/10 dark:border-brand-blue/35"
                  :aria-label="t('forecast.prevWeek')"
                  @click="shiftWeek(-1)"
                >
                  ‹
                </button>
                <span class="max-w-[11rem] truncate text-center text-[10px] font-medium tabular-nums dark:text-dark-txt2 text-light-txt2 sm:max-w-none">
                  {{ weekRangeLabel }}
                </span>
                <button
                  type="button"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-blue/20 text-brand-blue transition-colors hover:bg-brand-blue/10 dark:border-brand-blue/35"
                  :aria-label="t('forecast.nextWeek')"
                  @click="shiftWeek(1)"
                >
                  ›
                </button>
              </div>
            </div>
            <p
              v-if="calendarMode === 'all' && calendarTxLoading"
              class="mb-2 text-[10px] dark:text-dark-txt3 text-light-txt3"
            >
              {{ t('forecast.calendarMovementsLoading') }}
            </p>
            <p v-if="calendarMode === 'all' && calendarTxError" class="mb-2 text-[10px] text-red-400">
              {{ calendarTxError }}
            </p>
            <template v-if="calendarPeriod === 'month'">
              <div class="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
                <div v-for="(h, hi) in calendarMainGrid.headers" :key="`cal-h-${hi}`" class="py-1">{{ h }}</div>
              </div>
              <div class="space-y-1">
                <div v-for="(row, ri) in calendarMainGrid.weekRows" :key="`cal-w-${ri}`" class="grid grid-cols-7 gap-1">
                  <div
                    v-for="(cell, ci) in row"
                    :key="cell.ymd ?? `cal-pad-${ri}-${ci}`"
                    :class="[
                      'min-h-[5rem] rounded-lg border p-1.5 text-left sm:min-h-[6rem] md:min-h-[6.5rem] dark:border-white/[0.06] border-brand-blue/10',
                      cell.isToday ? 'ring-2 ring-brand-blue/50 dark:ring-brand-blue/40' : '',
                      cell.dayNum ? 'dark:bg-dark-surf/80 bg-light-surf/80' : 'bg-transparent',
                    ]"
                  >
                    <span v-if="cell.dayNum != null" class="text-sm font-bold tabular-nums dark:text-dark-txt text-light-txt">{{ cell.dayNum }}</span>
                    <div class="mt-1 space-y-0.5">
                      <div
                        v-for="(it, ii) in cell.items.slice(0, 4)"
                        :key="`c-it-${cell.ymd}-${ii}`"
                        :class="['truncate rounded border-l-2 pl-1 text-[10px] leading-snug dark:text-dark-txt2 text-light-txt2', dueSourceStripeClass(it.source)]"
                        :title="`${it.label} · ${formatEuro(it.amount, false)}`"
                      >
                        {{ it.label }}
                      </div>
                      <div v-if="cell.items.length > 4" class="text-[10px] dark:text-dark-txt3 text-light-txt3">+{{ cell.items.length - 4 }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
                <div v-for="(h, hi) in calendarWeekGrid.headers" :key="`wk-h-${hi}`" class="py-1">{{ h }}</div>
              </div>
              <div class="grid grid-cols-7 gap-1">
                <div
                  v-for="(cell, ci) in calendarWeekGrid.row"
                  :key="cell.ymd ?? `wk-cell-${ci}`"
                  :class="[
                    'min-h-[5rem] rounded-lg border p-1.5 text-left sm:min-h-[6rem] md:min-h-[6.5rem] dark:border-white/[0.06] border-brand-blue/10',
                    cell.isToday ? 'ring-2 ring-brand-blue/50 dark:ring-brand-blue/40' : '',
                    cell.dayNum != null ? 'dark:bg-dark-surf/80 bg-light-surf/80' : 'bg-transparent',
                  ]"
                >
                  <span v-if="cell.dayNum != null" class="text-sm font-bold tabular-nums dark:text-dark-txt text-light-txt">{{ cell.dayNum }}</span>
                  <div class="mt-1 space-y-0.5">
                    <div
                      v-for="(it, ii) in cell.items.slice(0, 4)"
                      :key="`wk-it-${cell.ymd}-${ii}`"
                      :class="['truncate rounded border-l-2 pl-1 text-[10px] leading-snug dark:text-dark-txt2 text-light-txt2', dueSourceStripeClass(it.source)]"
                      :title="`${it.label} · ${formatEuro(it.amount, false)}`"
                    >
                      {{ it.label }}
                    </div>
                    <div v-if="cell.items.length > 4" class="text-[10px] dark:text-dark-txt3 text-light-txt3">+{{ cell.items.length - 4 }}</div>
                  </div>
                </div>
              </div>
            </template>
            <p class="mt-2 text-[10px] dark:text-dark-txt3 text-light-txt3">{{ t('stats.recurringCalendarLegend') }}</p>
          </div>

          <div
            class="mx-auto w-full max-w-[12.5rem] rounded-xl border p-2 dark:border-white/[0.08] border-brand-blue/10 sm:max-w-[13rem] lg:mx-0 lg:max-w-none lg:justify-self-stretch"
          >
            <div class="mb-1.5 flex items-center gap-1">
              <p class="text-[10px] font-semibold leading-tight dark:text-dark-txt text-light-txt">{{ t('stats.recurringUpcomingTitle') }}</p>
              <InfoTip :text="t('stats.recurringUpcomingInfo')" :aria-label="t('stats.recurringUpcomingInfo')" />
            </div>
            <div v-if="!recurringDueUpcoming.length" class="py-3 text-center text-[10px] leading-snug dark:text-dark-txt2 text-light-txt2">
              {{ t('stats.recurringUpcomingEmpty') }}
            </div>
            <ul v-else class="max-h-[22rem] space-y-1 overflow-y-auto pr-0.5 text-[10px] leading-snug">
              <li
                v-for="(row, idx) in recurringDueUpcoming"
                :key="`up-${row.dueDate}-${row.label}-${idx}`"
                :class="['flex flex-col gap-0.5 rounded-lg border-l-2 py-1 pl-1.5 pr-1 dark:border-white/[0.04]', dueSourceStripeClass(row.source)]"
              >
                <span class="font-medium tabular-nums dark:text-dark-txt text-light-txt">{{ row.dueDate }}</span>
                <span class="line-clamp-2 break-words dark:text-dark-txt2 text-light-txt2">{{ row.label }}</span>
                <span class="shrink-0 tabular-nums font-medium dark:text-dark-txt text-light-txt">{{ formatEuro(row.amount, false) }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-6">
          <p class="mb-2 text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('stats.recurringDueDetailTitle') }}</p>
          <div v-if="!recurringDueCalendar.length" class="py-4 text-center text-xs dark:text-dark-txt2 text-light-txt2">
            {{ t('stats.recurringDueEmpty') }}
          </div>
          <div v-else class="max-h-52 overflow-y-auto rounded-xl border dark:border-white/[0.08] border-brand-blue/10">
            <table class="w-full min-w-[280px] text-left text-xs">
              <thead class="dark:bg-dark-surf bg-light-surf dark:text-dark-txt3 text-light-txt3">
                <tr>
                  <th class="px-2 py-2">{{ t('stats.recurringDueDate') }}</th>
                  <th class="px-2 py-2">{{ t('stats.recurringDueLabel') }}</th>
                  <th class="px-2 py-2">{{ t('stats.recurringDueSource') }}</th>
                  <th class="px-2 py-2 text-right">{{ t('stats.amount') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in recurringDueCalendar"
                  :key="`due-${row.dueDate}-${idx}`"
                  class="border-t dark:border-white/[0.06] border-brand-blue/8 dark:text-dark-txt text-light-txt"
                >
                  <td class="px-2 py-2 tabular-nums">{{ row.dueDate }}</td>
                  <td class="px-2 py-2 max-w-[12rem] truncate" :title="row.label">{{ row.label }}</td>
                  <td class="px-2 py-2">{{ dueSourceLabel(row.source) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums">{{ formatEuro(row.amount, false) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-3 border-t pt-4 dark:border-white/[0.08] border-brand-blue/10 md:grid-cols-2">
          <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
            <div class="flex items-center gap-1.5">
              <p class="font-semibold dark:text-dark-txt text-light-txt">{{ t('stats.recurringForecastTitle') }}</p>
              <InfoTip :text="t('stats.recurringForecastInfo')" :aria-label="t('stats.recurringForecastInfo')" />
            </div>
            <p class="mt-2 tabular-nums text-lg font-bold dark:text-dark-txt text-light-txt">
              {{ formatEuro(recurringForecastTotal, false) }}
            </p>
            <p class="mt-1 text-[10px] dark:text-dark-txt3 text-light-txt3">
              {{ t('stats.recurringForecastVsMonth', { spent: formatEuro(statsMonthSpendTotal, false) }) }}
            </p>
          </div>
          <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
            <div class="flex items-center gap-1.5">
              <p class="font-semibold dark:text-dark-txt text-light-txt">{{ t('stats.recurringKpiCoverageTitle') }}</p>
              <InfoTip :text="t('stats.recurringKpiCoverageInfo')" :aria-label="t('stats.recurringKpiCoverageInfo')" />
            </div>
            <p class="mt-2 text-lg font-bold tabular-nums dark:text-dark-txt text-light-txt">
              {{ kpiRecurringCoverageText }}
            </p>
          </div>
        </div>

        <div v-if="recurringMissed.length" class="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs dark:border-amber-400/20">
          <div class="mb-1 flex items-center gap-1.5">
            <p class="font-semibold text-amber-800 dark:text-amber-200">{{ t('stats.recurringMissedTitle') }}</p>
            <InfoTip :text="t('stats.recurringMissedInfo')" :aria-label="t('stats.recurringMissedInfo')" />
          </div>
          <ul class="mt-1 list-inside list-disc space-y-0.5 text-[11px] dark:text-amber-100/90 text-amber-900/90">
            <li v-for="(m, i) in recurringMissed" :key="`miss-${m.patternKey}-${i}`">
              {{ m.description }} · {{ t('stats.day') }} {{ m.dayOfMonth }}
            </li>
          </ul>
        </div>

        <div class="mt-4 rounded-xl border px-3 py-3 text-xs dark:border-white/[0.08] border-brand-blue/10">
          <div class="mb-2 flex flex-wrap items-center gap-1.5">
            <p class="font-semibold dark:text-dark-txt text-light-txt">{{ t('stats.forecastSimulatorTitle') }}</p>
            <InfoTip :text="t('stats.forecastSimulatorInfo')" :aria-label="t('stats.forecastSimulatorInfo')" />
          </div>
          <label class="mb-2 block max-w-xs">
            <span class="mb-1 block text-[10px] font-medium dark:text-dark-txt2 text-light-txt2">{{ t('stats.forecastSimulatorPct') }}</span>
            <input v-model.number="forecastSimPct" type="range" min="-50" max="100" step="5" class="w-full accent-brand-blue" />
            <span class="tabular-nums dark:text-dark-txt2 text-light-txt2">{{ forecastSimPct }}%</span>
          </label>
          <button
            type="button"
            class="rounded-xl px-4 py-2 text-xs font-semibold text-white bg-gradient-to-br from-brand-blue-dark to-brand-blue shadow-glow disabled:opacity-40"
            :disabled="forecastSimLoading"
            @click="runForecastSimulate"
          >
            {{ forecastSimLoading ? t('common.loading') : t('stats.forecastSimulatorRun') }}
          </button>
          <div v-if="forecastSimResult" class="mt-3 space-y-1 rounded-lg border border-brand-blue/10 p-2 dark:border-white/[0.06]">
            <p>{{ t('stats.forecastSimulatorBaseline') }}: <strong>{{ formatEuro(forecastSimResult.baselineMonthExpenseTotal, false) }}</strong></p>
            <p>{{ t('stats.forecastSimulatorResult') }}: <strong>{{ formatEuro(forecastSimResult.simulatedMonthExpenseTotal, false) }}</strong></p>
          </div>
        </div>
      </div>

      <div v-else-if="!forecastLoading" class="mw-card py-12 text-center text-sm dark:text-dark-txt2 text-light-txt2">
        {{ t('forecast.empty') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, type StatsMonthOverviewDto, type StatsForecastSimulateDto, type StatsRecurringDueItemDto, type ApiTransaction } from '@/services/api'
import { useCurrency } from '@/composables/useCurrency'
import { useWalletStore } from '@/stores/wallet'
import { fiscalYmForDate, monthCycleConfigFromSession } from '@/utils/monthPeriod'
import MwMonthStepper from '@/components/MwMonthStepper.vue'
import InfoTip from '@/components/InfoTip.vue'
import { resolveApiErrorI18nKey } from '@/utils/apiErrorMap'
import {
  addDaysYmd,
  buildCalendarMonthGrid,
  buildCalendarWeekRow,
  dueSourceStripeClass,
  itemsDueInYmdRange,
  mondayOfWeekContaining,
  weekYmdBoundsFromMonday,
} from '@/utils/paymentForecastCalendar'

const { formatEuro, roundMoney } = useCurrency()
const wallet = useWalletStore()
const { t, locale } = useI18n()

function defaultSelectedYm(): string {
  return fiscalYmForDate(new Date(), monthCycleConfigFromSession(wallet.user))
}

const FORECAST_CALENDAR_MODE_LS = 'miraiwallet.forecast.calendarMode'
const FORECAST_CALENDAR_PERIOD_LS = 'miraiwallet.forecast.calendarPeriod'
const FORECAST_WEEK_MONDAY_LS = 'miraiwallet.forecast.weekMonday'

function readForecastCalendarMode(): 'recurring' | 'all' {
  try {
    const v = localStorage.getItem(FORECAST_CALENDAR_MODE_LS)
    if (v === 'all' || v === 'recurring') return v
  } catch {
    /* modo privado u otro bloqueo */
  }
  return 'recurring'
}

function readForecastCalendarPeriod(): 'month' | 'week' {
  try {
    const v = localStorage.getItem(FORECAST_CALENDAR_PERIOD_LS)
    if (v === 'month' || v === 'week') return v
  } catch {
    /* ignorar */
  }
  return 'month'
}

function readWeekMondayInitial(ym: string): string {
  try {
    const v = localStorage.getItem(FORECAST_WEEK_MONDAY_LS)
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  } catch {
    /* ignorar */
  }
  return mondayOfWeekContaining(`${ym}-01`)
}

const selectedForecastYm = ref(defaultSelectedYm())
const forecastMain = ref<StatsMonthOverviewDto | null>(null)
const forecastLoading = ref(false)
const forecastError = ref<string | null>(null)

const calendarMode = ref<'recurring' | 'all'>(readForecastCalendarMode())
const calendarPeriod = ref<'month' | 'week'>(readForecastCalendarPeriod())
const selectedWeekMondayYmd = ref(readWeekMondayInitial(selectedForecastYm.value))

const calendarMovementItems = ref<StatsRecurringDueItemDto[]>([])
const calendarTxLoading = ref(false)
const calendarTxError = ref<string | null>(null)
let loadCalendarTxSeq = 0

const todayYmd = computed(() => {
  const t0 = new Date()
  return `${t0.getFullYear()}-${String(t0.getMonth() + 1).padStart(2, '0')}-${String(t0.getDate()).padStart(2, '0')}`
})

const calendarMainYm = computed(() => forecastMain.value?.month ?? selectedForecastYm.value)

const recurringDueMonthList = computed(() => forecastMain.value?.recurringDueCalendar ?? [])

const calendarItemsForMonthGrid = computed<StatsRecurringDueItemDto[]>(() => {
  if (calendarMode.value === 'all') return calendarMovementItems.value
  return recurringDueMonthList.value
})

const calendarItemsForWeekGrid = computed<StatsRecurringDueItemDto[]>(() => {
  if (calendarMode.value === 'all') return calendarMovementItems.value
  const { from, to } = weekYmdBoundsFromMonday(selectedWeekMondayYmd.value)
  return itemsDueInYmdRange(recurringDueMonthList.value, from, to)
})

const calendarMainGrid = computed(() =>
  buildCalendarMonthGrid(
    calendarMainYm.value,
    calendarItemsForMonthGrid.value,
    todayYmd.value,
    t,
  ),
)

const calendarWeekGrid = computed(() =>
  buildCalendarWeekRow(
    selectedWeekMondayYmd.value,
    calendarItemsForWeekGrid.value,
    todayYmd.value,
    t,
  ),
)

const weekRangeLabel = computed(() => formatWeekRangeLabel(selectedWeekMondayYmd.value, locale.value))

function formatWeekRangeLabel(weekMondayYmd: string, loc: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekMondayYmd.trim())
  if (!m) return weekMondayYmd
  const y = parseInt(m[1]!, 10)
  const mo = parseInt(m[2]!, 10) - 1
  const d = parseInt(m[3]!, 10)
  const start = new Date(y, mo, d)
  const end = new Date(y, mo, d + 6)
  const tag = loc === 'en' ? 'en-GB' : loc === 'de' ? 'de-DE' : 'es-ES'
  const oy = start.getFullYear()
  const ey = end.getFullYear()
  const om = start.getMonth()
  const em = end.getMonth()
  if (oy !== ey) {
    return `${start.toLocaleDateString(tag, { day: 'numeric', month: 'short', year: 'numeric' })} – ${end.toLocaleDateString(tag, { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  if (om !== em) {
    return `${start.toLocaleDateString(tag, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(tag, { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return `${start.getDate()}–${end.toLocaleDateString(tag, { day: 'numeric', month: 'long', year: 'numeric' })}`
}

function monthEndYmd(ym: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(ym.trim())
  if (!match) return `${ym}-28`
  const y = parseInt(match[1]!, 10)
  const mo = parseInt(match[2]!, 10) - 1
  const last = new Date(y, mo + 1, 0).getDate()
  return `${ym}-${String(last).padStart(2, '0')}`
}

const recurringAutoPatternCount = computed(() => forecastMain.value?.recurringExpenses?.length ?? 0)

const recurringDueCalendar = computed(() => forecastMain.value?.recurringDueCalendar ?? [])
const recurringDueUpcoming = computed(() => forecastMain.value?.recurringDueUpcoming ?? [])
const recurringForecastTotal = computed(() => roundMoney(forecastMain.value?.recurringForecastTotal ?? 0))
const statsMonthSpendTotal = computed(() => roundMoney(forecastMain.value?.totals.monthExpenseTotal ?? 0))
const recurringMissed = computed(() => forecastMain.value?.recurringMissed ?? [])
const kpiRecurringCoverageText = computed(() => {
  const v = forecastMain.value?.kpiRecurringCoveragePct
  if (v == null || Number.isNaN(v)) return '—'
  return `${roundMoney(v)}%`
})

function dueSourceLabel(source: string): string {
  if (source === 'manual') return t('stats.recurringDueSourceManual')
  if (source === 'planned') return t('stats.recurringDueSourcePlanned')
  if (source === 'movement') return t('forecast.dueSourceMovement')
  return t('stats.recurringDueSourceAuto')
}

function buildMovementCalendarLabel(tx: ApiTransaction): string {
  const tag = tx.type === 'income' ? '↑' : tx.type === 'expense' ? '↓' : '↔'
  const desc = String(tx.description ?? '').trim().replace(/\s+/g, ' ')
  const short = desc.length > 48 ? `${desc.slice(0, 47)}…` : desc
  return `${tag} ${short || '—'}`.trim()
}

function setCalendarMode(mode: 'recurring' | 'all'): void {
  if (calendarMode.value === mode) return
  calendarMode.value = mode
  try {
    localStorage.setItem(FORECAST_CALENDAR_MODE_LS, mode)
  } catch {
    /* ignorar */
  }
}

function setCalendarPeriod(period: 'month' | 'week'): void {
  if (calendarPeriod.value === period) return
  calendarPeriod.value = period
  try {
    localStorage.setItem(FORECAST_CALENDAR_PERIOD_LS, period)
  } catch {
    /* ignorar */
  }
}

function persistWeekMonday(ymd: string): void {
  try {
    localStorage.setItem(FORECAST_WEEK_MONDAY_LS, ymd)
  } catch {
    /* ignorar */
  }
}

function shiftWeek(delta: number): void {
  const next = addDaysYmd(selectedWeekMondayYmd.value, delta * 7)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return
  selectedWeekMondayYmd.value = next
  persistWeekMonday(next)
}

async function loadCalendarMovementRange(from: string, to: string): Promise<void> {
  const seq = ++loadCalendarTxSeq
  calendarTxLoading.value = true
  calendarTxError.value = null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    calendarMovementItems.value = []
    calendarTxLoading.value = false
    return
  }
  try {
    const items: StatsRecurringDueItemDto[] = []
    let page = 1
    const limit = 100
    while (page <= 200) {
      const { data, meta } = await api.getTransactions({
        from,
        to,
        page,
        limit,
        sortBy: 'date',
        sortOrder: 'asc',
        isExcluded: false,
      })
      if (seq !== loadCalendarTxSeq) return
      for (const tx of data) {
        items.push({
          dueDate: String(tx.date).slice(0, 10),
          label: buildMovementCalendarLabel(tx),
          amount: Math.abs(Number(tx.amount)),
          source: 'movement',
        })
      }
      if (!meta.hasNext) break
      page += 1
    }
    if (seq !== loadCalendarTxSeq) return
    calendarMovementItems.value = items
  } catch (e: unknown) {
    if (seq !== loadCalendarTxSeq) return
    calendarTxError.value = t(resolveApiErrorI18nKey(e, 'stats.loadStatsError'))
    calendarMovementItems.value = []
  } finally {
    if (seq === loadCalendarTxSeq) calendarTxLoading.value = false
  }
}

const forecastSimPct = ref(0)
const forecastSimResult = ref<StatsForecastSimulateDto | null>(null)
const forecastSimLoading = ref(false)

async function runForecastSimulate(): Promise<void> {
  forecastSimLoading.value = true
  try {
    forecastSimResult.value = await api.getForecastSimulate({
      month: selectedForecastYm.value,
      expenseMultiplierPct: forecastSimPct.value,
    })
  } catch (e: unknown) {
    forecastError.value = t(resolveApiErrorI18nKey(e, 'stats.loadStatsError'))
    forecastSimResult.value = null
  } finally {
    forecastSimLoading.value = false
  }
}

async function loadForecastMonth(ym: string): Promise<void> {
  forecastLoading.value = true
  forecastError.value = null
  try {
    forecastMain.value = await api.getStatsMonthOverview(ym)
  } catch (e: unknown) {
    forecastError.value = t(resolveApiErrorI18nKey(e, 'stats.loadStatsError'))
    forecastMain.value = null
  } finally {
    forecastLoading.value = false
  }
}

watch(selectedForecastYm, (ym) => {
  forecastSimResult.value = null
  void loadForecastMonth(ym)
  const mon = mondayOfWeekContaining(`${ym}-01`)
  selectedWeekMondayYmd.value = mon
  persistWeekMonday(mon)
})

watch(
  () =>
    [calendarMode.value, calendarPeriod.value, selectedForecastYm.value, selectedWeekMondayYmd.value] as const,
  ([mode, period, ymSel, weekMon]) => {
    if (mode !== 'all') {
      loadCalendarTxSeq += 1
      calendarTxLoading.value = false
      calendarTxError.value = null
      calendarMovementItems.value = []
      return
    }
    let from: string
    let to: string
    if (period === 'month') {
      if (!/^(\d{4})-(\d{2})$/.test(ymSel)) {
        calendarMovementItems.value = []
        return
      }
      from = `${ymSel}-01`
      to = monthEndYmd(ymSel)
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weekMon)) {
        calendarMovementItems.value = []
        return
      }
      from = weekMon
      to = addDaysYmd(weekMon, 6)
    }
    void loadCalendarMovementRange(from, to)
  },
  { immediate: true },
)

watch(
  () => [wallet.user?.monthCycleMode, wallet.user?.monthCycleStartDay, wallet.user?.monthCycleEndDay, wallet.user?.monthCycleAnchor],
  () => {
    const ym = defaultSelectedYm()
    if (ym !== selectedForecastYm.value) selectedForecastYm.value = ym
    else void loadForecastMonth(ym)
  },
)

onMounted(() => {
  void loadForecastMonth(selectedForecastYm.value)
})
</script>
