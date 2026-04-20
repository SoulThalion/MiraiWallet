<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <p class="text-xs dark:text-dark-txt2 text-light-txt2">
          {{ t('stats.periodHint') }}
        </p>
      </div>
      <div class="flex flex-shrink-0 flex-col items-stretch gap-2 sm:items-end">
        <p v-if="statsError" class="max-w-sm rounded-xl border border-red-400/40 px-3 py-2 text-xs text-red-400 dark:bg-dark-surf">
          {{ statsError }}
        </p>
      </div>
    </div>

    <div
      :class="[
        'grid grid-cols-1 gap-4 transition-opacity md:gap-6 lg:grid-cols-3',
        statsLoading ? 'pointer-events-none opacity-50' : '',
      ]"
    >
      <!-- Donut: gasto del mes por categoría -->
      <div class="mw-card lg:col-span-1">
        <div class="mb-3 flex items-start justify-between gap-2">
          <div>
            <p class="mb-1 text-xs font-semibold dark:text-dark-txt text-light-txt">{{ t('stats.monthDistribution') }}</p>
            <p class="text-[10px] dark:text-dark-txt2 text-light-txt2">{{ selectedDistributionLabel }}</p>
          </div>
          <MwMonthStepper
            v-model="selectedDistributionYm"
            :prev-aria-label="t('dateRange.prevMonth')"
            :next-aria-label="t('dateRange.nextMonth')"
          />
        </div>
        <div v-if="statsDonutSegments.length === 0" class="py-8 text-center text-sm dark:text-dark-txt2 text-light-txt2">
          {{ t('stats.noExpenseThisMonth') }}
        </div>
        <DonutChart v-else :segments="statsDonutSegments" :center-label="donutCenterLabel" />
      </div>

      <!-- Barras: 12 meses del año del mes seleccionado (el gráfico crece con la altura de la fila del grid) -->
      <div class="mw-card flex h-full min-h-[16rem] flex-col md:col-span-2 lg:col-span-2">
        <div class="mb-3 flex items-start justify-between gap-2">
          <div>
            <p class="mb-1 shrink-0 text-xs font-semibold dark:text-dark-txt text-light-txt">{{ t('stats.monthlyExpense') }}</p>
            <p class="shrink-0 text-[10px] dark:text-dark-txt2 text-light-txt2">{{ t('stats.yearLabel', { year: chartYear }) }}</p>
          </div>
          <MwMonthStepper
            v-model="selectedBarsYear"
            mode="year"
            :min-year="barYearMin"
            :max-year="barYearMax"
            :prev-aria-label="t('stats.prevYear')"
            :next-aria-label="t('stats.nextYear')"
          />
        </div>
        <div class="min-h-0 flex-1">
          <BarChart class="h-full min-h-[10rem]" :bars="chartBars" :max-val="barMaxVal" />
        </div>
      </div>

      <!-- KPIs -->
      <div class="mw-card">
        <p class="mb-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('stats.avgExpenseWindow') }}</p>
        <p class="font-display text-2xl font-extrabold dark:text-dark-txt text-light-txt md:text-3xl">
          {{ formatEuro(yearlyAverageExpense, false) }}
        </p>
        <p class="mt-2 text-[10px] dark:text-dark-txt3 text-light-txt3">
          {{ t('stats.avgExpenseHint') }}
        </p>
      </div>

      <div class="mw-card">
        <p class="mb-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('stats.lowestExpenseMonth') }}</p>
        <p class="font-display text-2xl font-extrabold dark:text-dark-txt text-light-txt md:text-3xl">
          {{ formatEuro(bestMonthAmount, false) }}
        </p>
        <p class="mt-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ bestMonthYearLabel }}</p>
      </div>

      <div class="mw-card">
        <p class="mb-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('stats.monthExpenseTotal') }}</p>
        <p class="font-display text-2xl font-extrabold dark:text-dark-txt text-light-txt md:text-3xl">
          {{ formatEuro(statsMonthSpendTotal, false) }}
        </p>
        <p class="mt-1 text-xs dark:text-dark-txt2 text-light-txt2">
          {{ t('stats.totalAssignedBudget') }}: {{ formatEuro(monthBudgetTotal, false) }} · {{ selectedMonthLabel }}
        </p>
      </div>

      <div class="mw-card">
        <p class="mb-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('stats.avgIncomeWindow') }}</p>
        <p class="font-display text-2xl font-extrabold text-brand-green md:text-3xl">
          {{ formatEuro(yearlyAverageIncome, true) }}
        </p>
        <p class="mt-2 text-[10px] dark:text-dark-txt3 text-light-txt3">
          {{ t('stats.avgIncomeHint') }}
        </p>
      </div>

      <div class="mw-card">
        <p class="mb-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('stats.lowestIncomeMonth') }}</p>
        <p class="font-display text-2xl font-extrabold text-brand-green md:text-3xl">
          {{ formatEuro(bestIncomeMonthAmount, true) }}
        </p>
        <p class="mt-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ bestIncomeMonthYearLabel }}</p>
      </div>

      <div class="mw-card">
        <p class="mb-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('stats.monthIncomeTotal') }}</p>
        <p class="font-display text-2xl font-extrabold text-brand-green md:text-3xl">
          {{ formatEuro(statsMonthIncomeTotal, true) }}
        </p>
        <p class="mt-1 text-xs dark:text-dark-txt2 text-light-txt2">
          {{ t('stats.sameFiscalMonth') }}
        </p>
      </div>

      <div class="mw-card md:col-span-2 lg:col-span-3" v-if="budgetPace">
        <div class="mb-1 flex items-center gap-1.5">
          <p class="font-display text-sm font-bold dark:text-dark-txt text-light-txt">{{ t('stats.paceTitle') }}</p>
          <InfoTip :text="t('stats.paceInfoGeneral')" :aria-label="t('stats.paceInfoGeneral')" />
        </div>
        <p class="mb-3 text-[10px] dark:text-dark-txt2 text-light-txt2">
          {{ t('stats.paceDaysProgress', { elapsed: budgetPace.daysElapsed, total: budgetPace.daysTotal, pct: budgetPace.periodProgressPct }) }}
        </p>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
            <div class="flex items-center gap-1.5">
              <p class="font-semibold">{{ t('stats.paceLinear') }}</p>
              <InfoTip :text="t('stats.paceInfoLinear')" :aria-label="t('stats.paceInfoLinear')" />
            </div>
            <p class="mt-1">{{ t('stats.paceActualVsExpected', { actual: formatEuro(budgetPace.actualSpent, false), expected: formatEuro(budgetPace.expectedSpentLinear, false) }) }}</p>
            <p :class="['mt-1 font-semibold', paceBadgeClass(budgetPace.statusLinear)]">
              {{ paceStatusLabel(budgetPace.statusLinear, budgetPace.pacePctLinear, budgetPace.actualSpent, budgetPace.expectedSpentLinear) }} · {{ paceStatusText(budgetPace.actualSpent, budgetPace.expectedSpentLinear) }}
            </p>
          </div>
          <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
            <div class="flex items-center gap-1.5">
              <p class="font-semibold">{{ t('stats.paceWeighted') }}</p>
              <InfoTip :text="t('stats.paceInfoWeighted')" :aria-label="t('stats.paceInfoWeighted')" />
            </div>
            <p class="mt-1">{{ t('stats.paceActualVsExpected', { actual: formatEuro(budgetPace.actualSpent, false), expected: formatEuro(budgetPace.expectedSpentWeighted, false) }) }}</p>
            <p :class="['mt-1 font-semibold', paceBadgeClass(budgetPace.statusWeighted)]">
              {{ paceStatusLabel(budgetPace.statusWeighted, budgetPace.pacePctWeighted, budgetPace.actualSpent, budgetPace.expectedSpentWeighted) }} · {{ paceStatusText(budgetPace.actualSpent, budgetPace.expectedSpentWeighted) }}
            </p>
          </div>
        </div>
        <div class="mt-3 max-h-56 overflow-y-auto rounded-xl border dark:border-white/[0.08] border-brand-blue/10">
          <table class="w-full text-xs">
            <thead class="dark:bg-dark-surf bg-light-surf dark:text-dark-txt3 text-light-txt3">
              <tr>
                <th class="px-2 py-2 text-left">{{ t('stats.category') }}</th>
                <th class="px-2 py-2 text-right">{{ t('stats.paceLinearPct') }}</th>
                <th class="px-2 py-2 text-right">{{ t('stats.paceWeightedPct') }}</th>
                <th class="px-2 py-2 text-right">{{ t('stats.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in budgetPaceCategories" :key="`stats-pace-${row.categoryId}`" class="border-t dark:border-white/[0.06] border-brand-blue/8">
                <td class="px-2 py-2">{{ row.icon }} {{ row.name }}</td>
                <td class="px-2 py-2 text-right tabular-nums">{{ row.pacePctLinear > 0 ? '+' : '' }}{{ row.pacePctLinear.toFixed(1) }}%</td>
                <td class="px-2 py-2 text-right tabular-nums">{{ row.pacePctWeighted > 0 ? '+' : '' }}{{ row.pacePctWeighted.toFixed(1) }}%</td>
                <td :class="['px-2 py-2 text-right font-semibold', paceBadgeClass(row.statusWeighted)]">{{ paceStatusLabel(row.statusWeighted, row.pacePctWeighted, row.actualSpent, row.expectedSpentWeighted) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Desglose -->
      <div class="mw-card md:col-span-2 lg:col-span-3">
        <div class="mb-1 flex items-center gap-1.5">
          <p class="font-display text-sm font-bold dark:text-dark-txt text-light-txt">{{ t('stats.breakdownByCategory') }}</p>
          <InfoTip :text="t('stats.breakdownInfo')" :aria-label="t('stats.breakdownInfo')" />
        </div>
        <p class="mb-4 text-[10px] dark:text-dark-txt2 text-light-txt2">
          {{ t('stats.monthExpenseVsBudget') }} · {{ selectedMonthLabel }}
        </p>
        <div class="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="cat in categoriesForBreakdown" :key="cat.id">
            <button
              type="button"
              class="mb-1.5 flex w-full items-center justify-between gap-2 text-left"
              @click="toggleBreakdownCategory(cat.id)"
            >
              <span class="text-xs font-medium dark:text-dark-txt2 text-light-txt2">{{ cat.icon }} {{ cat.name }}</span>
              <span class="flex items-center gap-2">
                <span class="text-xs font-bold tabular-nums dark:text-dark-txt text-light-txt">
                  {{ categoryStatsLine(cat) }}
                </span>
                <span
                  v-if="cat.subcategories?.length"
                  class="text-[10px] dark:text-dark-txt3 text-light-txt3"
                >
                  {{ breakdownCategoryExpanded(cat.id) ? '▼' : '▶' }}
                </span>
              </span>
            </button>
            <div class="h-1.5 overflow-hidden rounded-full dark:bg-dark-surf bg-light-surf">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: budgetBarWidth(cat), background: cat.color }"
              />
            </div>
            <div
              v-if="cat.subcategories?.length && breakdownCategoryExpanded(cat.id)"
              class="mt-2 space-y-1 rounded-lg border border-brand-blue/10 p-2 dark:border-white/[0.08]"
            >
              <div
                v-for="sub in cat.subcategories"
                :key="`break-sub-${cat.id}-${sub.id}`"
                class="flex items-center justify-between gap-2 text-[11px]"
              >
                <span class="min-w-0 truncate dark:text-dark-txt2 text-light-txt2">{{ sub.icon }} {{ sub.name }}</span>
                <span class="shrink-0 tabular-nums dark:text-dark-txt text-light-txt">
                  {{ subcategoryStatsLine(sub) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ventana móvil: últimos 12 meses con datos, con desglose por subcategoría -->
      <div class="mw-card md:col-span-2 lg:col-span-3">
        <p class="mb-1 font-display text-sm font-bold dark:text-dark-txt text-light-txt">
          {{ t('stats.monthlyAverages') }}
        </p>
        <p class="mb-4 text-[10px] leading-relaxed dark:text-dark-txt2 text-light-txt2 max-w-3xl">
          {{ t('stats.monthlyAveragesHint') }}
        </p>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p class="mb-2 text-xs font-semibold dark:text-dark-txt text-light-txt">{{ t('stats.expensesCategories') }}</p>
            <div class="overflow-x-auto rounded-xl border dark:border-white/[0.07] border-brand-blue/10">
              <table class="w-full min-w-[300px] text-left text-xs">
                <thead class="dark:bg-dark-surf bg-light-surf text-[10px] uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
                  <tr>
                    <th class="w-8 px-1 py-2" aria-hidden="true"></th>
                    <th class="px-2 py-2 font-semibold">{{ t('stats.category') }}</th>
                    <th class="px-3 py-2 font-semibold text-right">{{ t('stats.windowTotal') }}</th>
                    <th class="px-3 py-2 font-semibold text-right">{{ t('stats.avgPerMonth') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="expenseCatYearAvg.length === 0">
                    <td colspan="4" class="px-3 py-6 text-center dark:text-dark-txt2 text-light-txt2">{{ t('stats.noExpensesInWindow') }}</td>
                  </tr>
                  <template v-for="row in expenseCatYearAvg" :key="row.categoryId">
                    <tr
                      :class="[
                        'border-t dark:border-white/[0.06] border-brand-blue/8 dark:text-dark-txt text-light-txt',
                        yearHasSubs('exp', row.categoryId)
                          ? 'cursor-pointer transition-colors hover:bg-brand-blue/[0.06] dark:hover:bg-white/[0.04]'
                          : '',
                      ]"
                      :role="yearHasSubs('exp', row.categoryId) ? 'button' : undefined"
                      :tabindex="yearHasSubs('exp', row.categoryId) ? 0 : -1"
                      :aria-expanded="yearHasSubs('exp', row.categoryId) ? yearCatExpanded('exp', row.categoryId) : undefined"
                      @click="yearToggleCat('exp', row.categoryId)"
                      @keydown.enter.prevent="yearToggleCat('exp', row.categoryId)"
                      @keydown.space.prevent="yearToggleCat('exp', row.categoryId)"
                    >
                      <td class="px-1 py-2 text-center text-[10px] dark:text-dark-txt3 text-light-txt3">
                        <span v-if="yearHasSubs('exp', row.categoryId)">{{ yearCatExpanded('exp', row.categoryId) ? '▼' : '▶' }}</span>
                      </td>
                      <td class="px-2 py-2">
                        <span class="mr-1">{{ row.icon }}</span>{{ row.name }}
                      </td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ formatEuro(row.totalYear, false) }}</td>
                      <td class="px-3 py-2 text-right tabular-nums font-medium">{{ formatEuro(row.avgPerMonth, false) }}</td>
                    </tr>
                    <tr
                      v-for="sub in yearSubsVisible('exp', row.categoryId)"
                      :key="subYearRowKey(sub)"
                      class="border-t dark:border-white/[0.04] border-brand-blue/6 bg-black/[0.02] dark:bg-white/[0.03] dark:text-dark-txt2 text-light-txt2"
                    >
                      <td></td>
                      <td class="px-2 py-1.5 pl-6">
                        <span class="mr-1 opacity-80">{{ sub.icon }}</span>{{ sub.name }}
                      </td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatEuro(sub.totalYear, false) }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatEuro(sub.avgPerMonth, false) }}</td>
                    </tr>
                  </template>
                </tbody>
                <tfoot v-if="overview">
                  <tr
                    class="border-t-2 border-brand-blue/20 dark:border-white/[0.12] bg-black/[0.03] font-semibold dark:bg-white/[0.04] dark:text-dark-txt text-light-txt"
                  >
                    <td class="px-1 py-2.5"></td>
                    <td class="px-2 py-2.5">{{ t('stats.totalWindowAllExpenses') }}</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ formatEuro(yearTableExpenseTotal, false) }}</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ formatEuro(yearTableExpenseAvg, false) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div>
            <p class="mb-2 text-xs font-semibold dark:text-dark-txt text-light-txt">{{ t('stats.incomeCategories') }}</p>
            <div class="overflow-x-auto rounded-xl border dark:border-white/[0.07] border-brand-blue/10">
              <table class="w-full min-w-[300px] text-left text-xs">
                <thead class="dark:bg-dark-surf bg-light-surf text-[10px] uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
                  <tr>
                    <th class="w-8 px-1 py-2" aria-hidden="true"></th>
                    <th class="px-2 py-2 font-semibold">{{ t('stats.category') }}</th>
                    <th class="px-3 py-2 font-semibold text-right">{{ t('stats.windowTotal') }}</th>
                    <th class="px-3 py-2 font-semibold text-right">{{ t('stats.avgPerMonth') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="incomeCatYearAvg.length === 0">
                    <td colspan="4" class="px-3 py-6 text-center dark:text-dark-txt2 text-light-txt2">{{ t('stats.noIncomeInWindow') }}</td>
                  </tr>
                  <template v-for="row in incomeCatYearAvg" :key="row.categoryId">
                    <tr
                      :class="[
                        'border-t dark:border-white/[0.06] border-brand-blue/8 dark:text-dark-txt text-light-txt',
                        yearHasSubs('inc', row.categoryId)
                          ? 'cursor-pointer transition-colors hover:bg-brand-blue/[0.06] dark:hover:bg-white/[0.04]'
                          : '',
                      ]"
                      :role="yearHasSubs('inc', row.categoryId) ? 'button' : undefined"
                      :tabindex="yearHasSubs('inc', row.categoryId) ? 0 : -1"
                      :aria-expanded="yearHasSubs('inc', row.categoryId) ? yearCatExpanded('inc', row.categoryId) : undefined"
                      @click="yearToggleCat('inc', row.categoryId)"
                      @keydown.enter.prevent="yearToggleCat('inc', row.categoryId)"
                      @keydown.space.prevent="yearToggleCat('inc', row.categoryId)"
                    >
                      <td class="px-1 py-2 text-center text-[10px] dark:text-dark-txt3 text-light-txt3">
                        <span v-if="yearHasSubs('inc', row.categoryId)">{{ yearCatExpanded('inc', row.categoryId) ? '▼' : '▶' }}</span>
                      </td>
                      <td class="px-2 py-2">
                        <span class="mr-1">{{ row.icon }}</span>{{ row.name }}
                      </td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ formatEuro(row.totalYear, true) }}</td>
                      <td class="px-3 py-2 text-right tabular-nums font-medium">{{ formatEuro(row.avgPerMonth, true) }}</td>
                    </tr>
                    <tr
                      v-for="sub in yearSubsVisible('inc', row.categoryId)"
                      :key="subYearRowKey(sub)"
                      class="border-t dark:border-white/[0.04] border-brand-blue/6 bg-black/[0.02] dark:bg-white/[0.03] dark:text-dark-txt2 text-light-txt2"
                    >
                      <td></td>
                      <td class="px-2 py-1.5 pl-6">
                        <span class="mr-1 opacity-80">{{ sub.icon }}</span>{{ sub.name }}
                      </td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatEuro(sub.totalYear, true) }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatEuro(sub.avgPerMonth, true) }}</td>
                    </tr>
                  </template>
                </tbody>
                <tfoot v-if="overview">
                  <tr
                    class="border-t-2 border-brand-blue/20 dark:border-white/[0.12] bg-black/[0.03] font-semibold dark:bg-white/[0.04] dark:text-dark-txt text-light-txt"
                  >
                    <td class="px-1 py-2.5"></td>
                    <td class="px-2 py-2.5">{{ t('stats.totalWindowAllIncome') }}</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ formatEuro(yearTableIncomeTotal, true) }}</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ formatEuro(yearTableIncomeAvg, true) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Gastos recurrentes (estadística simple) -->
      <div class="mw-card md:col-span-2 lg:col-span-3">
        <p class="mb-1 font-display text-sm font-bold dark:text-dark-txt text-light-txt">{{ t('stats.recurringExpenses') }}</p>
        <p class="mb-4 text-[10px] leading-relaxed dark:text-dark-txt2 text-light-txt2 max-w-3xl">
          {{ t('stats.recurringHint') }}
        </p>
        <div v-if="recurringExpensesList.length === 0" class="py-8 text-center text-sm dark:text-dark-txt2 text-light-txt2">
          {{ t('stats.noRecurringPatterns') }}
        </div>
        <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
            <p class="dark:text-dark-txt2 text-light-txt2">{{ t('stats.totalsPatterns', { count: recurringExpensesList.length }) }}</p>
            <p class="mt-1 text-lg font-bold tabular-nums dark:text-dark-txt text-light-txt">{{ recurringExpensesList.length }}</p>
          </div>
          <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
            <p class="dark:text-dark-txt2 text-light-txt2">{{ t('stats.amount') }}</p>
            <p class="mt-1 text-lg font-bold tabular-nums dark:text-dark-txt text-light-txt">{{ formatEuro(recurringAmountSum, false) }}</p>
          </div>
          <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
            <p class="dark:text-dark-txt2 text-light-txt2">{{ t('stats.times') }}</p>
            <p class="mt-1 text-lg font-bold tabular-nums dark:text-dark-txt text-light-txt">{{ recurringOccurrenceSum }}</p>
          </div>
        </div>
        <div v-if="recurringExpensesList.length" class="mt-3 space-y-2">
          <div
            v-for="row in recurringTopByAmount"
            :key="`rec-top-${row.patternKey ?? row.description}-${row.dayOfMonth}`"
            class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10"
          >
            <div class="mb-1 flex items-center justify-between gap-2">
              <p class="min-w-0 truncate font-semibold dark:text-dark-txt text-light-txt">
                {{ row.categoryIcon }} {{ row.categoryName }}<span v-if="row.subcategoryName"> · {{ row.subcategoryName }}</span> · {{ row.description }}
              </p>
              <span class="shrink-0 tabular-nums">{{ formatEuro(row.amount, false) }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full dark:bg-dark-surf bg-light-surf">
              <div
                class="h-full rounded-full bg-gradient-to-r from-brand-blue-dark to-brand-blue"
                :style="{ width: recurringBarWidth(row) }"
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
import { useI18n } from 'vue-i18n'
import {
  api,
  type StatsMonthOverviewDto,
  type StatsMonthCategoryDto,
  type StatsYearAvgSubcategoryDto,
  type StatsRecurringExpenseDto,
} from '@/services/api'
import { useCurrency } from '@/composables/useCurrency'
import { useWalletStore, type DonutSegment, type MonthlyData } from '@/stores/wallet'
import { fiscalYmForDate, monthCycleConfigFromSession } from '@/utils/monthPeriod'
import { formatYearMonthEs } from '@/utils/yearMonthDisplay'
import DonutChart from '@/components/DonutChart.vue'
import BarChart from '@/components/BarChart.vue'
import MwMonthStepper from '@/components/MwMonthStepper.vue'
import InfoTip from '@/components/InfoTip.vue'
import IconPigMoney from '@/icons/IconPigMoney.vue'
import { resolveApiErrorI18nKey } from '@/utils/apiErrorMap'
import { paceSimpleText, paceStatusClass, paceStatusLabel as resolvePaceStatusLabel } from '@/composables/usePaceStatus'
import { useToast } from '@/composables/useToast'

const { formatEuro, roundMoney } = useCurrency()
const wallet = useWalletStore()
const { t, locale } = useI18n()
const toast = useToast()

function defaultSelectedYm(): string {
  return fiscalYmForDate(new Date(), monthCycleConfigFromSession(wallet.user))
}

const selectedMonthYm = ref(defaultSelectedYm())
const selectedDistributionYm = ref(defaultSelectedYm())
const selectedBarsYear = ref(parseInt(defaultSelectedYm().slice(0, 4), 10))

const overview = ref<StatsMonthOverviewDto | null>(null)
const barsOverview = ref<StatsMonthOverviewDto | null>(null)
const distributionOverview = ref<StatsMonthOverviewDto | null>(null)
const monthLoading = ref(false)
const barsLoading = ref(false)
const statsError = ref<string | null>(null)
const statsLoading = computed(() => monthLoading.value || barsLoading.value)

async function loadMonthOverview(ym: string): Promise<void> {
  monthLoading.value = true
  statsError.value = null
  try {
    overview.value = await api.getStatsMonthOverview(ym)
    yearExpandedCats.value = {}
  } catch (e: unknown) {
    statsError.value = t(resolveApiErrorI18nKey(e, 'stats.loadStatsError'))
    overview.value = null
  } finally {
    monthLoading.value = false
  }
}

async function loadBarsOverview(year: number): Promise<void> {
  barsLoading.value = true
  statsError.value = null
  try {
    barsOverview.value = await api.getStatsMonthOverview(`${year}-01`)
  } catch (e: unknown) {
    statsError.value = t(resolveApiErrorI18nKey(e, 'stats.loadStatsError'))
    barsOverview.value = null
  } finally {
    barsLoading.value = false
  }
}

async function loadDistributionOverview(ym: string): Promise<void> {
  try {
    distributionOverview.value = await api.getStatsMonthOverview(ym)
  } catch {
    distributionOverview.value = null
  }
}

watch(selectedMonthYm, (ym) => {
  void loadMonthOverview(ym)
})

watch(selectedBarsYear, (y) => {
  void loadBarsOverview(y)
})
watch(selectedDistributionYm, (ym) => {
  void loadDistributionOverview(ym)
})

watch(
  () => [
    wallet.user?.monthCycleMode,
    wallet.user?.monthCycleStartDay,
    wallet.user?.monthCycleEndDay,
    wallet.user?.monthCycleAnchor,
  ],
  () => {
    const ym = defaultSelectedYm()
    selectedMonthYm.value = ym
    selectedDistributionYm.value = ym
    selectedBarsYear.value = parseInt(ym.slice(0, 4), 10)
    void Promise.all([
      loadMonthOverview(selectedMonthYm.value),
      loadBarsOverview(selectedBarsYear.value),
      loadDistributionOverview(selectedDistributionYm.value),
    ])
  }
)

onMounted(() => {
  if (!wallet.categories.length) void wallet.loadCategories()
  void Promise.all([
    loadMonthOverview(selectedMonthYm.value),
    loadBarsOverview(selectedBarsYear.value),
    loadDistributionOverview(selectedDistributionYm.value),
  ])
})

const chartYear = computed(() => selectedBarsYear.value)
const barYearMin = computed(() => new Date().getFullYear() - 15)
const barYearMax = computed(() => new Date().getFullYear() + 1)

const selectedMonthLabel = computed(() => formatYearMonthEs(selectedMonthYm.value))
const selectedDistributionLabel = computed(() => formatYearMonthEs(selectedDistributionYm.value))

const chartBars = computed<MonthlyData[]>(() => {
  const o = barsOverview.value
  if (!o) return []
  const [selY, selM] = selectedMonthYm.value.split('-')
  const selectedForBars = String(chartYear.value) === String(selY) ? Number(selM) : 0
  const localeTag = locale.value === 'en' ? 'en-US' : locale.value === 'de' ? 'de-DE' : 'es-ES'
  return o.monthlyBars.map(b => ({
    month: new Date(chartYear.value, Math.max(0, Number(b.month) - 1), 1).toLocaleDateString(localeTag, { month: 'short' }),
    amount: b.expenses,
    current: b.isCurrentSystemMonth,
    selected: Number(b.month) === selectedForBars,
    income: b.income,
    net: b.net,
  }))
})

const barMaxVal = computed(() => Math.max(...chartBars.value.map(b => b.amount), 1))

const yearlyAverageExpense = computed(() => roundMoney(overview.value?.totals.yearlyAverageExpense ?? 0))
const yearlyAverageIncome = computed(() => roundMoney(overview.value?.totals.yearlyAverageIncome ?? 0))
const yearTableExpenseTotal = computed(() => roundMoney(overview.value?.totals.yearExpenseTotal ?? 0))
const yearTableExpenseAvg = computed(() => roundMoney(overview.value?.totals.yearlyAverageExpense ?? 0))
const yearTableIncomeTotal = computed(() => roundMoney(overview.value?.totals.yearIncomeTotal ?? 0))
const yearTableIncomeAvg = computed(() => roundMoney(overview.value?.totals.yearIncomeAvgPerMonth ?? 0))
const bestMonthAmount = computed(() => roundMoney(overview.value?.totals.bestMonthAmount ?? 0))
const bestIncomeMonthAmount = computed(() => roundMoney(overview.value?.totals.bestIncomeMonthAmount ?? 0))
const monthBudgetTotal = computed(() => roundMoney(overview.value?.totals.monthBudgetTotal ?? 0))

const statsMonthSpendTotal = computed(() => roundMoney(overview.value?.totals.monthExpenseTotal ?? 0))
const statsMonthIncomeTotal = computed(() => roundMoney(overview.value?.totals.monthIncomeTotal ?? 0))
const budgetPace = computed(() => overview.value?.budgetPace ?? null)
const budgetPaceCategories = computed(() => (overview.value?.budgetPace?.categories ?? []).slice().sort((a, b) => b.pacePctWeighted - a.pacePctWeighted))

function paceBadgeClass(status: string): string {
  return paceStatusClass(status)
}

function paceStatusLabel(status: string, pacePct: number, actualSpent?: number, expectedSpent?: number): string {
  return resolvePaceStatusLabel(t, 'stats', status, pacePct, actualSpent, expectedSpent)
}

function paceStatusText(actualSpent?: number, expectedSpent?: number): string {
  return paceSimpleText(t, 'stats', actualSpent, expectedSpent)
}

const statsDonutSegments = computed<DonutSegment[]>(() => {
  const rows = distributionOverview.value?.categories.filter(c => roundMoney(c.spent) > 0) ?? []
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
  const totalValue = roundMoney(distributionOverview.value?.totals.monthExpenseTotal ?? 0)
  const localeTag = locale.value === 'en' ? 'en-US' : locale.value === 'de' ? 'de-DE' : 'es-ES'
  const s = totalValue.toLocaleString(localeTag, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `€${s}`
})

const categoriesForBreakdown = computed(() =>
  (overview.value?.categories ?? []).filter(
    c => roundMoney(c.budget) > 0
  )
)
const breakdownExpanded = ref<Record<string, boolean>>({})

const expenseCatYearAvg = computed(() => overview.value?.expenseCategoryYearAvg ?? [])
const expenseSubYearAvg = computed(() => overview.value?.expenseSubcategoryYearAvg ?? [])
const incomeCatYearAvg = computed(() => overview.value?.incomeCategoryYearAvg ?? [])
const incomeSubYearAvg = computed(() => overview.value?.incomeSubcategoryYearAvg ?? [])
const recurringExpensesList = computed(() => overview.value?.recurringExpenses ?? [])

const recurringAmountSum = computed(() =>
  roundMoney(recurringExpensesList.value.reduce((s, r) => s + roundMoney(r.amount), 0))
)
const recurringOccurrenceSum = computed(() =>
  recurringExpensesList.value.reduce((s, r) => s + (r.occurrenceCount ?? 0), 0)
)
const recurringTopByAmount = computed(() =>
  [...recurringExpensesList.value]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
)
const recurringTopMaxAmount = computed(() =>
  Math.max(...recurringTopByAmount.value.map((row) => Number(row.amount) || 0), 0)
)
function recurringBarWidth(row: StatsRecurringExpenseDto): string {
  const max = recurringTopMaxAmount.value
  if (max <= 0) return '0%'
  return `${Math.max(0, Math.min(100, (Number(row.amount) / max) * 100)).toFixed(1)}%`
}

const excludedCategoryIds = ref<string[]>([])
const excludedSubcategoryIds = ref<string[]>([])
const excludeSaving = ref(false)
const excludeError = ref('')
const savingsCategoryIds = ref<string[]>([])
const savingsSubcategoryIds = ref<string[]>([])
const savingsSaving = ref(false)
const savingsError = ref('')

watch(
  () => wallet.user,
  (u) => {
    excludedCategoryIds.value = Array.isArray(u?.recurringExcludedCategoryIds) ? [...u.recurringExcludedCategoryIds] : []
    excludedSubcategoryIds.value = Array.isArray(u?.recurringExcludedSubcategoryIds)
      ? [...u.recurringExcludedSubcategoryIds]
      : []
    savingsCategoryIds.value = Array.isArray(u?.recurringSavingsCategoryIds) ? [...u.recurringSavingsCategoryIds] : []
    savingsSubcategoryIds.value = Array.isArray(u?.recurringSavingsSubcategoryIds) ? [...u.recurringSavingsSubcategoryIds] : []
  },
  { immediate: true, deep: true }
)

const expenseCategoriesForRecurring = computed(() =>
  wallet.categories.filter(c => Boolean(c.id) && c.categoryType !== 'income')
)

function revertExcludeStateFromUser(): void {
  const u = wallet.user
  excludedCategoryIds.value = Array.isArray(u?.recurringExcludedCategoryIds) ? [...u.recurringExcludedCategoryIds] : []
  excludedSubcategoryIds.value = Array.isArray(u?.recurringExcludedSubcategoryIds)
    ? [...u.recurringExcludedSubcategoryIds]
    : []
}

function revertSavingsStateFromUser(): void {
  const u = wallet.user
  savingsCategoryIds.value = Array.isArray(u?.recurringSavingsCategoryIds) ? [...u.recurringSavingsCategoryIds] : []
  savingsSubcategoryIds.value = Array.isArray(u?.recurringSavingsSubcategoryIds) ? [...u.recurringSavingsSubcategoryIds] : []
}

async function onToggleExcludeCategory(categoryId: string, checked: boolean): Promise<void> {
  excludeError.value = ''
  const set = new Set(excludedCategoryIds.value)
  if (checked) set.add(categoryId)
  else set.delete(categoryId)
  excludedCategoryIds.value = [...set]
  excludeSaving.value = true
  try {
    const u = await api.updateProfile({ recurringExcludedCategoryIds: excludedCategoryIds.value })
    wallet.user = u
    await Promise.all([loadMonthOverview(selectedMonthYm.value), loadBarsOverview(selectedBarsYear.value)])
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    excludeError.value = t(resolveApiErrorI18nKey(e, 'stats.saveExclusionError'))
    toast.error(excludeError.value)
    revertExcludeStateFromUser()
  } finally {
    excludeSaving.value = false
  }
}

async function onToggleSavingsCategory(categoryId: string, checked: boolean): Promise<void> {
  savingsError.value = ''
  const set = new Set(savingsCategoryIds.value)
  if (checked) set.add(categoryId)
  else set.delete(categoryId)
  savingsCategoryIds.value = [...set]
  savingsSaving.value = true
  try {
    const u = await api.updateProfile({ recurringSavingsCategoryIds: savingsCategoryIds.value })
    wallet.user = u
    await Promise.all([loadMonthOverview(selectedMonthYm.value), loadBarsOverview(selectedBarsYear.value)])
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    savingsError.value = t(resolveApiErrorI18nKey(e, 'stats.saveRecurringSavingsError'))
    toast.error(savingsError.value)
    revertSavingsStateFromUser()
  } finally {
    savingsSaving.value = false
  }
}

async function onToggleSavingsSubcategory(subcategoryId: string, checked: boolean): Promise<void> {
  savingsError.value = ''
  const set = new Set(savingsSubcategoryIds.value)
  if (checked) set.add(subcategoryId)
  else set.delete(subcategoryId)
  savingsSubcategoryIds.value = [...set]
  savingsSaving.value = true
  try {
    const u = await api.updateProfile({ recurringSavingsSubcategoryIds: savingsSubcategoryIds.value })
    wallet.user = u
    await Promise.all([loadMonthOverview(selectedMonthYm.value), loadBarsOverview(selectedBarsYear.value)])
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    savingsError.value = t(resolveApiErrorI18nKey(e, 'stats.saveRecurringSavingsError'))
    toast.error(savingsError.value)
    revertSavingsStateFromUser()
  } finally {
    savingsSaving.value = false
  }
}

async function onToggleExcludeSubcategory(subcategoryId: string, checked: boolean): Promise<void> {
  excludeError.value = ''
  const set = new Set(excludedSubcategoryIds.value)
  if (checked) set.add(subcategoryId)
  else set.delete(subcategoryId)
  excludedSubcategoryIds.value = [...set]
  excludeSaving.value = true
  try {
    const u = await api.updateProfile({ recurringExcludedSubcategoryIds: excludedSubcategoryIds.value })
    wallet.user = u
    await Promise.all([loadMonthOverview(selectedMonthYm.value), loadBarsOverview(selectedBarsYear.value)])
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    excludeError.value = t(resolveApiErrorI18nKey(e, 'stats.saveExclusionError'))
    toast.error(excludeError.value)
    revertExcludeStateFromUser()
  } finally {
    excludeSaving.value = false
  }
}

const dismissModalRow = ref<StatsRecurringExpenseDto | null>(null)
const dismissBusy = ref(false)
const dismissError = ref('')
const savingRecurringPatternKey = ref<string | null>(null)
const recategorizeModalRow = ref<StatsRecurringExpenseDto | null>(null)
const recategorizeCategoryId = ref('')
const recategorizeSubcategoryId = ref('')
const recategorizeBusy = ref(false)
const recategorizeError = ref('')

function openDismissRecurring(row: StatsRecurringExpenseDto): void {
  dismissError.value = ''
  dismissModalRow.value = row
}

async function confirmDismissRecurring(): Promise<void> {
  const row = dismissModalRow.value
  if (!row?.patternKey) return
  dismissBusy.value = true
  dismissError.value = ''
  try {
    await api.dismissRecurringPattern(row.patternKey)
    dismissModalRow.value = null
    await Promise.all([loadMonthOverview(selectedMonthYm.value), loadBarsOverview(selectedBarsYear.value)])
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    dismissError.value = t(resolveApiErrorI18nKey(e, 'stats.couldNotApply'))
    toast.error(dismissError.value)
  } finally {
    dismissBusy.value = false
  }
}

async function toggleRecurringSavings(row: StatsRecurringExpenseDto): Promise<void> {
  if (!row.patternKey) return
  savingRecurringPatternKey.value = row.patternKey
  statsError.value = null
  try {
    await api.setRecurringPatternSavings(row.patternKey, !row.isSavings)
    const nextKeys = new Set(Array.isArray(wallet.user?.recurringSavingsPatternKeys) ? wallet.user!.recurringSavingsPatternKeys : [])
    if (!row.isSavings) nextKeys.add(row.patternKey)
    else nextKeys.delete(row.patternKey)
    wallet.user = await api.updateProfile({ recurringSavingsPatternKeys: [...nextKeys] })
    await Promise.all([loadMonthOverview(selectedMonthYm.value), loadBarsOverview(selectedBarsYear.value)])
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    statsError.value = t(resolveApiErrorI18nKey(e, 'stats.saveRecurringSavingsError'))
    if (statsError.value) toast.error(statsError.value)
  } finally {
    savingRecurringPatternKey.value = null
  }
}

const recategorizeSubcategoryOptions = computed(() => {
  const category = expenseCategoriesForRecurring.value.find(c => c.id === recategorizeCategoryId.value)
  return category?.subcategories ?? []
})

function openRecategorizeRecurring(row: StatsRecurringExpenseDto): void {
  recategorizeError.value = ''
  recategorizeModalRow.value = row
  recategorizeCategoryId.value = row.categoryId ?? ''
  recategorizeSubcategoryId.value = row.subcategoryId ?? ''
}

watch(recategorizeCategoryId, (id) => {
  if (!id) {
    recategorizeSubcategoryId.value = ''
    return
  }
  const exists = recategorizeSubcategoryOptions.value.some(s => s.id === recategorizeSubcategoryId.value)
  if (!exists) recategorizeSubcategoryId.value = ''
})

async function confirmRecategorizeRecurring(): Promise<void> {
  const row = recategorizeModalRow.value
  if (!row?.patternKey) return
  recategorizeBusy.value = true
  recategorizeError.value = ''
  try {
    await api.setRecurringPatternCategory(
      row.patternKey,
      recategorizeCategoryId.value || null,
      recategorizeSubcategoryId.value || null
    )
    recategorizeModalRow.value = null
    await Promise.all([loadMonthOverview(selectedMonthYm.value), loadBarsOverview(selectedBarsYear.value)])
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    recategorizeError.value = t(resolveApiErrorI18nKey(e, 'stats.couldNotApply'))
    toast.error(recategorizeError.value)
  } finally {
    recategorizeBusy.value = false
  }
}

/** Filas de categoría desplegadas en medias anuales (`exp` / `inc`). */
const yearExpandedCats = ref<Record<string, boolean>>({})

type YearAvgKind = 'exp' | 'inc'

function yearCatKey(kind: YearAvgKind, categoryId: string): string {
  return `${kind}:${categoryId}`
}

function subYearRowKey(row: StatsYearAvgSubcategoryDto): string {
  return `${row.categoryId}-${row.subcategoryId ?? 'none'}`
}

function yearSubsFor(kind: YearAvgKind, categoryId: string): StatsYearAvgSubcategoryDto[] {
  const list = kind === 'exp' ? expenseSubYearAvg.value : incomeSubYearAvg.value
  return list.filter(s => s.categoryId === categoryId)
}

function yearHasSubs(kind: YearAvgKind, categoryId: string): boolean {
  return yearSubsFor(kind, categoryId).length > 0
}

function yearCatExpanded(kind: YearAvgKind, categoryId: string): boolean {
  return !!yearExpandedCats.value[yearCatKey(kind, categoryId)]
}

function yearToggleCat(kind: YearAvgKind, categoryId: string): void {
  if (!yearHasSubs(kind, categoryId)) return
  const k = yearCatKey(kind, categoryId)
  yearExpandedCats.value = { ...yearExpandedCats.value, [k]: !yearExpandedCats.value[k] }
}

function yearSubsVisible(kind: YearAvgKind, categoryId: string): StatsYearAvgSubcategoryDto[] {
  if (!yearCatExpanded(kind, categoryId)) return []
  return yearSubsFor(kind, categoryId)
}

function categoryStatsLine(cat: StatsMonthCategoryDto): string {
  const g = roundMoney(cat.spent)
  const inc = roundMoney(cat.incomeInCategory)
  const b = roundMoney(cat.budget)
  const left = g > 0
    ? formatEuro(Math.max(0, roundMoney(g - inc)), false)
    : inc > 0
      ? formatEuro(inc, true)
      : formatEuro(0, false)
  return `${left} / ${formatEuro(b, false)}`
}

function subcategoryStatsLine(sub: NonNullable<StatsMonthCategoryDto['subcategories']>[number]): string {
  const g = roundMoney(sub.spent)
  const inc = roundMoney(sub.incomeInCategory)
  const b = roundMoney(sub.budget)
  const left = g > 0
    ? formatEuro(Math.max(0, roundMoney(g - inc)), false)
    : inc > 0
      ? formatEuro(inc, true)
      : formatEuro(0, false)
  return `${left} / ${formatEuro(b, false)}`
}

function breakdownCategoryExpanded(categoryId: string): boolean {
  return !!breakdownExpanded.value[categoryId]
}

function toggleBreakdownCategory(categoryId: string): void {
  const current = !!breakdownExpanded.value[categoryId]
  breakdownExpanded.value = { ...breakdownExpanded.value, [categoryId]: !current }
}

function budgetBarWidth(cat: StatsMonthCategoryDto): string {
  const b = roundMoney(cat.budget)
  if (b <= 0) return '0%'
  return `${Math.min(100, Math.round((roundMoney(cat.spent) / b) * 100))}%`
}

const bestMonthYearLabel = computed(() => {
  const label = overview.value?.totals.bestMonthLabel
  if (!label) return '—'
  return normalizeBestMonthLabel(label)
})

const bestIncomeMonthYearLabel = computed(() => {
  const label = overview.value?.totals.bestIncomeMonthLabel
  if (!label) return '—'
  return normalizeBestMonthLabel(label)
})

function normalizeBestMonthLabel(raw: string): string {
  const v = raw.trim()
  const ym = /^(\d{4})-(\d{2})$/.exec(v)
  if (ym) {
    return formatYearMonthEs(`${ym[1]}-${ym[2]}`)
  }
  const parts = /^([A-Za-zÀ-ÿ]+)\s+(\d{4})$/.exec(v)
  if (!parts) return v
  const monthMap: Record<string, number> = {
    ene: 1, enero: 1, jan: 1, januar: 1,
    feb: 2, febrero: 2, februar: 2,
    mar: 3, marzo: 3, maerz: 3, märz: 3,
    abr: 4, abril: 4, apr: 4, april: 4,
    may: 5, mayo: 5, mai: 5,
    jun: 6, junio: 6, juni: 6,
    jul: 7, julio: 7, juli: 7,
    ago: 8, agosto: 8, aug: 8,
    sep: 9, septiembre: 9, sept: 9,
    oct: 10, octubre: 10, okt: 10, oktober: 10,
    nov: 11, noviembre: 11,
    dic: 12, diciembre: 12, dez: 12, dezember: 12, dec: 12, december: 12,
  }
  const m = monthMap[parts[1].toLowerCase()]
  if (!m) return v
  return formatYearMonthEs(`${parts[2]}-${String(m).padStart(2, '0')}`)
}

</script>

<style scoped>
details[open] > summary .chevron-expand {
  transform: rotate(90deg);
}
</style>
