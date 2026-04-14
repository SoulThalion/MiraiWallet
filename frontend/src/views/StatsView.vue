<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <p class="text-xs dark:text-dark-txt2 text-light-txt2">
          Elige el periodo desde el calendario: un solo endpoint carga gasto por categoría, presupuestos del mes y las 12
          barras del año.
        </p>
      </div>
      <div class="flex flex-shrink-0 flex-col items-stretch gap-2 sm:items-end">
        <MwYearMonthPicker v-model="selectedYm" />
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

      <!-- Ventana móvil: últimos 12 meses con datos, con desglose por subcategoría -->
      <div class="mw-card md:col-span-2 lg:col-span-3">
        <p class="mb-1 font-display text-sm font-bold dark:text-dark-txt text-light-txt">
          Medias mensuales (últimos 12 meses con datos)
        </p>
        <p class="mb-4 text-[10px] leading-relaxed dark:text-dark-txt2 text-light-txt2 max-w-3xl">
          Total por categoría en una ventana móvil: <strong class="dark:text-dark-txt text-light-txt">últimos 12 meses fiscales con datos</strong>
          hasta el mes consultado (puede cruzar años). La media mensual divide solo entre los meses con movimiento
          del tipo correspondiente (gasto/ingreso).
          Pulsa una categoría para ver el desglose por subcategoría.
        </p>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p class="mb-2 text-xs font-semibold dark:text-dark-txt text-light-txt">Gastos · categorías</p>
            <div class="overflow-x-auto rounded-xl border dark:border-white/[0.07] border-brand-blue/10">
              <table class="w-full min-w-[300px] text-left text-xs">
                <thead class="dark:bg-dark-surf bg-light-surf text-[10px] uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
                  <tr>
                    <th class="w-8 px-1 py-2" aria-hidden="true"></th>
                    <th class="px-2 py-2 font-semibold">Categoría</th>
                    <th class="px-3 py-2 font-semibold text-right">Total ventana</th>
                    <th class="px-3 py-2 font-semibold text-right">Media / mes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="expenseCatYearAvg.length === 0">
                    <td colspan="4" class="px-3 py-6 text-center dark:text-dark-txt2 text-light-txt2">Sin gastos en la ventana móvil.</td>
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
                    <td class="px-2 py-2.5">Total ventana (todos los gastos)</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ formatEuro(yearTableExpenseTotal, false) }}</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ formatEuro(yearTableExpenseAvg, false) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div>
            <p class="mb-2 text-xs font-semibold dark:text-dark-txt text-light-txt">Ingresos · categorías</p>
            <div class="overflow-x-auto rounded-xl border dark:border-white/[0.07] border-brand-blue/10">
              <table class="w-full min-w-[300px] text-left text-xs">
                <thead class="dark:bg-dark-surf bg-light-surf text-[10px] uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
                  <tr>
                    <th class="w-8 px-1 py-2" aria-hidden="true"></th>
                    <th class="px-2 py-2 font-semibold">Categoría</th>
                    <th class="px-3 py-2 font-semibold text-right">Total ventana</th>
                    <th class="px-3 py-2 font-semibold text-right">Media / mes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="incomeCatYearAvg.length === 0">
                    <td colspan="4" class="px-3 py-6 text-center dark:text-dark-txt2 text-light-txt2">Sin ingresos en la ventana móvil.</td>
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
                    <td class="px-2 py-2.5">Total ventana (todos los ingresos)</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ formatEuro(yearTableIncomeTotal, true) }}</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ formatEuro(yearTableIncomeAvg, true) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Gastos recurrentes -->
      <div class="mw-card md:col-span-2 lg:col-span-3">
        <p class="mb-1 font-display text-sm font-bold dark:text-dark-txt text-light-txt">Gastos recurrentes</p>
        <p class="mb-4 text-[10px] leading-relaxed dark:text-dark-txt2 text-light-txt2 max-w-3xl">
          Misma categoría, subcategoría, importe y
          <strong class="dark:text-dark-txt text-light-txt">día del mes</strong>;
          el concepto se compara tras quitar prefijos tipo «Pago en…» y signos de puntuación, para agrupar textos del banco parecidos.
          Al menos dos meses naturales distintos (últimos 36 meses, hasta 20.000 movimientos más recientes).
        </p>

        <details class="mb-4 rounded-xl border border-brand-blue/10 px-3 py-2 dark:border-white/[0.07]">
          <summary class="cursor-pointer select-none text-xs font-semibold text-brand-blue hover:underline">
            Excluir categorías y subcategorías del detector
          </summary>
          <p class="mt-2 text-[10px] leading-snug dark:text-dark-txt2 text-light-txt2">
            Los gastos marcados no entran en el agrupado de recurrentes (toda la categoría, o solo una subcategoría). Las
            categorías con subcategorías se despliegan al pulsar la fila para elegir cuáles excluir. Puedes revertirlo cuando
            quieras.
          </p>
          <div v-if="!expenseCategoriesForRecurring.length" class="mt-2 text-[10px] dark:text-dark-txt3 text-light-txt3">
            Carga categorías desde otra pestaña o recarga la app.
          </div>
          <div v-else class="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            <template v-for="c in expenseCategoriesForRecurring" :key="c.id">
              <label
                v-if="!(c.subcategories?.length)"
                class="flex cursor-pointer items-center gap-2 rounded-lg border border-brand-blue/10 px-2 py-2 text-xs dark:border-white/[0.06] dark:text-dark-txt2 text-light-txt2"
              >
                <input
                  type="checkbox"
                  class="rounded border-brand-blue/30"
                  :checked="excludedCategoryIds.includes(c.id!)"
                  :disabled="excludeSaving"
                  @change="onToggleExcludeCategory(c.id!, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ c.icon }} {{ c.name }}</span>
                <span class="ml-auto text-[10px] dark:text-dark-txt3 text-light-txt3">Sin subcategorías</span>
              </label>
              <details
                v-else
                class="rounded-lg border border-brand-blue/10 open:border-brand-blue/20 dark:border-white/[0.07] dark:open:border-white/[0.12]"
              >
                <summary
                  class="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-xs marker:content-none [&::-webkit-details-marker]:hidden"
                >
                  <span
                    class="chevron-expand inline-flex w-4 shrink-0 justify-center font-mono text-[10px] text-brand-blue transition-transform dark:text-brand-blue"
                    aria-hidden="true"
                  >▶</span>
                  <label class="flex cursor-pointer items-center gap-1.5" @click.stop>
                    <input
                      type="checkbox"
                      class="rounded border-brand-blue/30"
                      :checked="excludedCategoryIds.includes(c.id!)"
                      :disabled="excludeSaving"
                      @change="onToggleExcludeCategory(c.id!, ($event.target as HTMLInputElement).checked)"
                    />
                  </label>
                  <span class="min-w-0 font-medium dark:text-dark-txt text-light-txt">
                    <span class="mr-0.5">{{ c.icon }}</span>{{ c.name }}
                  </span>
                  <span class="ml-auto shrink-0 text-[10px] tabular-nums dark:text-dark-txt3 text-light-txt3">
                    {{ c.subcategories!.length }} sub
                  </span>
                </summary>
                <div
                  class="space-y-1.5 border-t border-brand-blue/8 px-3 py-2.5 pl-9 dark:border-white/[0.06] dark:bg-white/[0.02]"
                >
                  <p class="text-[10px] font-medium uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
                    Excluir subcategorías
                  </p>
                  <label
                    v-for="s in c.subcategories"
                    :key="s.id"
                    class="flex cursor-pointer items-center gap-2 text-xs dark:text-dark-txt2 text-light-txt2"
                  >
                    <input
                      type="checkbox"
                      class="rounded border-brand-blue/30"
                      :checked="excludedSubcategoryIds.includes(s.id)"
                      :disabled="excludeSaving"
                      @change="onToggleExcludeSubcategory(s.id, ($event.target as HTMLInputElement).checked)"
                    />
                    <span>{{ s.icon }} {{ s.name }}</span>
                  </label>
                </div>
              </details>
            </template>
          </div>
          <p v-if="excludeSaving" class="mt-2 text-[10px] dark:text-dark-txt3 text-light-txt3">Guardando…</p>
          <p v-if="excludeError" class="mt-2 text-[10px] text-red-400">{{ excludeError }}</p>
        </details>

        <div v-if="recurringExpensesList.length === 0" class="py-8 text-center text-sm dark:text-dark-txt2 text-light-txt2">
          No se detectaron patrones recurrentes con esos criterios.
        </div>
        <div v-else class="overflow-x-auto rounded-xl border dark:border-white/[0.07] border-brand-blue/10">
          <table class="w-full min-w-[720px] text-left text-xs">
            <thead class="dark:bg-dark-surf bg-light-surf text-[10px] uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
              <tr>
                <th class="px-3 py-2 font-semibold">Día</th>
                <th class="px-3 py-2 font-semibold">Categoría</th>
                <th class="px-3 py-2 font-semibold">Concepto</th>
                <th class="px-3 py-2 font-semibold text-right">Importe</th>
                <th class="px-3 py-2 font-semibold text-right">Veces</th>
                <th class="px-3 py-2 font-semibold text-right">Meses</th>
                <th class="px-3 py-2 font-semibold">Primera</th>
                <th class="px-3 py-2 font-semibold">Última</th>
                <th class="px-3 py-2 font-semibold text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in recurringExpensesList"
                :key="row.patternKey || `${row.categoryId ?? 'x'}-${row.subcategoryId ?? 'n'}-${row.dayOfMonth}-${row.amount}-${row.description}`"
                class="border-t dark:border-white/[0.06] border-brand-blue/8 dark:text-dark-txt text-light-txt"
              >
                <td class="px-3 py-2 tabular-nums font-medium">{{ row.dayOfMonth }}</td>
                <td class="px-3 py-2">
                  <span class="mr-1">{{ row.categoryIcon }}</span>
                  <span>{{ row.categoryName }}</span>
                  <span v-if="row.subcategoryName" class="dark:text-dark-txt2 text-light-txt2"> · {{ row.subcategoryName }}</span>
                </td>
                <td class="px-3 py-2 max-w-[14rem] truncate" :title="row.description">{{ row.description }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatEuro(row.amount, false) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ row.occurrenceCount }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ row.distinctMonthCount }}</td>
                <td class="px-3 py-2 tabular-nums dark:text-dark-txt2 text-light-txt2">{{ row.firstDate }}</td>
                <td class="px-3 py-2 tabular-nums dark:text-dark-txt2 text-light-txt2">{{ row.lastDate }}</td>
                <td class="px-3 py-2 text-center">
                  <button
                    type="button"
                    class="text-xs font-semibold text-red-400 hover:underline"
                    @click="openDismissRecurring(row)"
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr
                class="border-t-2 border-brand-blue/20 bg-black/[0.03] font-semibold dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-dark-txt text-light-txt"
              >
                <td class="px-3 py-2.5">—</td>
                <td class="px-3 py-2.5" colspan="2">Totales ({{ recurringExpensesList.length }} patrones)</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ formatEuro(recurringAmountSum, false) }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ recurringOccurrenceSum }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">—</td>
                <td class="px-3 py-2.5">—</td>
                <td class="px-3 py-2.5">—</td>
                <td class="px-3 py-2.5">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="dismissModalRow"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-dismiss-title"
        @click.self="dismissModalRow = null"
      >
        <div
          class="w-full max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-brand-blue/10 bg-light-card p-5 shadow-xl dark:border-white/[0.07] dark:bg-dark-card sm:max-w-md sm:rounded-2xl"
          @click.stop
        >
          <p id="recurring-dismiss-title" class="font-display text-base font-bold dark:text-dark-txt text-light-txt">
            Dejar de mostrar como recurrente
          </p>
          <p class="mt-3 text-sm leading-relaxed dark:text-dark-txt2 text-light-txt2">
            Se ocultará este patrón ({{ dismissModalRow.categoryIcon }} {{ dismissModalRow.categoryName
            }}<span v-if="dismissModalRow.subcategoryName"> · {{ dismissModalRow.subcategoryName }}</span>,
            {{ dismissModalRow.description }}, {{ formatEuro(dismissModalRow.amount, false) }}).
          </p>
          <p class="mt-3 text-xs leading-relaxed text-amber-600 dark:text-amber-400/95">
            No se borran movimientos. Si en un <strong>mes natural posterior</strong> al actual vuelve a aparecer un
            cargo que coincida con el patrón, volverá a listarse como recurrente.
          </p>
          <p v-if="dismissError" class="mt-3 text-xs text-red-400">{{ dismissError }}</p>
          <div class="mt-5 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-xl border border-brand-blue/15 py-3 text-sm font-semibold dark:border-white/[0.08] dark:text-dark-txt2"
              :disabled="dismissBusy"
              @click="dismissModalRow = null"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="flex-1 rounded-xl bg-red-500/90 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
              :disabled="dismissBusy"
              @click="confirmDismissRecurring"
            >
              {{ dismissBusy ? 'Aplicando…' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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
import MwYearMonthPicker from '@/components/MwYearMonthPicker.vue'

const { formatEuro, roundMoney } = useCurrency()
const wallet = useWalletStore()

function defaultSelectedYm(): string {
  return fiscalYmForDate(new Date(), monthCycleConfigFromSession(wallet.user))
}

const selectedYm = ref(defaultSelectedYm())

const overview = ref<StatsMonthOverviewDto | null>(null)
const statsLoading = ref(false)
const statsError = ref<string | null>(null)

async function loadOverview(ym: string): Promise<void> {
  statsLoading.value = true
  statsError.value = null
  try {
    overview.value = await api.getStatsMonthOverview(ym)
    yearExpandedCats.value = {}
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
  if (!wallet.categories.length) void wallet.loadCategories()
  void loadOverview(selectedYm.value)
})

const chartYear = computed(() => parseInt(selectedYm.value.split('-')[0]!, 10))

const selectedMonthLabel = computed(() => formatYearMonthEs(selectedYm.value))

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
const yearTableExpenseTotal = computed(() => roundMoney(overview.value?.totals.yearExpenseTotal ?? 0))
const yearTableExpenseAvg = computed(() => roundMoney(overview.value?.totals.yearlyAverageExpense ?? 0))
const yearTableIncomeTotal = computed(() => roundMoney(overview.value?.totals.yearIncomeTotal ?? 0))
const yearTableIncomeAvg = computed(() => roundMoney(overview.value?.totals.yearIncomeAvgPerMonth ?? 0))
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

const excludedCategoryIds = ref<string[]>([])
const excludedSubcategoryIds = ref<string[]>([])
const excludeSaving = ref(false)
const excludeError = ref('')

watch(
  () => wallet.user,
  (u) => {
    excludedCategoryIds.value = Array.isArray(u?.recurringExcludedCategoryIds) ? [...u.recurringExcludedCategoryIds] : []
    excludedSubcategoryIds.value = Array.isArray(u?.recurringExcludedSubcategoryIds)
      ? [...u.recurringExcludedSubcategoryIds]
      : []
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
    await loadOverview(selectedYm.value)
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
        : null
    excludeError.value = typeof msg === 'string' ? msg : 'No se pudo guardar la exclusión.'
    revertExcludeStateFromUser()
  } finally {
    excludeSaving.value = false
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
    await loadOverview(selectedYm.value)
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
        : null
    excludeError.value = typeof msg === 'string' ? msg : 'No se pudo guardar la exclusión.'
    revertExcludeStateFromUser()
  } finally {
    excludeSaving.value = false
  }
}

const dismissModalRow = ref<StatsRecurringExpenseDto | null>(null)
const dismissBusy = ref(false)
const dismissError = ref('')

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
    await loadOverview(selectedYm.value)
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
        : null
    dismissError.value = typeof msg === 'string' ? msg : 'No se pudo aplicar.'
  } finally {
    dismissBusy.value = false
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

<style scoped>
details[open] > summary .chevron-expand {
  transform: rotate(90deg);
}
</style>
