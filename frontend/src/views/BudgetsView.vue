<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <div class="grid grid-cols-1 gap-4 md:gap-6">
      <div class="mw-card">
        <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">{{ t('budgets.title') }}</p>
        <p class="mt-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('budgets.subtitle', { month: budgetMonth }) }}</p>
      </div>

      <BookmarkTabs
        :model-value="activeBudgetTab"
        :tabs="budgetTabs"
        @update:modelValue="(value) => { activeBudgetTab = value as BudgetTabId }"
      />

      <div v-show="activeBudgetTab === 'recurring'" class="mw-card -mt-4 rounded-tl-none rounded-tr-2xl md:-mt-6">
        <div class="mb-1 flex items-center gap-1.5">
          <p class="font-display text-sm font-bold dark:text-dark-txt text-light-txt">{{ t('stats.recurringExpenses') }}</p>
          <InfoTip :text="t('budgets.recurringAnchorHint')" :aria-label="t('budgets.recurringAnchorHint')" />
        </div>
        <p class="mb-4 text-[10px] leading-relaxed dark:text-dark-txt2 text-light-txt2 max-w-3xl">
          {{ t('stats.recurringHint') }}
        </p>
        <p class="mb-3 text-[11px] font-semibold dark:text-dark-txt2 text-light-txt2">
          {{ t('budgets.recurringAutoDetected') }}
        </p>
        <details class="mb-4 rounded-xl border border-brand-blue/10 px-3 py-2 dark:border-white/[0.07]">
          <summary class="cursor-pointer select-none text-xs font-semibold text-brand-blue hover:underline">
            {{ t('stats.excludeCategoriesDetector') }}
          </summary>
          <p class="mt-2 text-[10px] leading-snug dark:text-dark-txt2 text-light-txt2">{{ t('stats.excludeDetectorHint') }}</p>
          <div v-if="!expenseCategoriesForRecurring.length" class="mt-2 text-[10px] dark:text-dark-txt3 text-light-txt3">{{ t('stats.loadCategoriesHint') }}</div>
          <div v-else class="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            <label
              v-for="c in expenseCategoriesForRecurring"
              :key="`rex-${c.id}`"
              class="flex cursor-pointer items-center gap-2 rounded-lg border border-brand-blue/10 px-2 py-2 text-xs dark:border-white/[0.06] dark:text-dark-txt2 text-light-txt2"
            >
              <input
                type="checkbox"
                class="rounded border-brand-blue/30"
                :checked="recurringExcludedCategoryIds.includes(c.id!)"
                :disabled="recurringSaving"
                @change="onToggleRecurringExcludeCategory(c.id!, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ c.icon }} {{ c.name }}</span>
            </label>
          </div>
        </details>

        <details class="mb-4 rounded-xl border border-brand-blue/10 px-3 py-2 dark:border-white/[0.07]">
          <summary class="cursor-pointer select-none text-xs font-semibold text-brand-green hover:underline">
            {{ t('stats.markSavingsByCategory') }}
          </summary>
          <p class="mt-2 text-[10px] leading-snug dark:text-dark-txt2 text-light-txt2">{{ t('stats.markSavingsByCategoryHint') }}</p>
          <div v-if="!expenseCategoriesForRecurring.length" class="mt-2 text-[10px] dark:text-dark-txt3 text-light-txt3">{{ t('stats.loadCategoriesHint') }}</div>
          <div v-else class="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            <label
              v-for="c in expenseCategoriesForRecurring"
              :key="`rsav-${c.id}`"
              class="flex cursor-pointer items-center gap-2 rounded-lg border border-brand-blue/10 px-2 py-2 text-xs dark:border-white/[0.06] dark:text-dark-txt2 text-light-txt2"
            >
              <input
                type="checkbox"
                class="rounded border-brand-blue/30"
                :checked="recurringSavingsCategoryIds.includes(c.id!)"
                :disabled="recurringSaving"
                @change="onToggleRecurringSavingsCategory(c.id!, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ c.icon }} {{ c.name }}</span>
            </label>
          </div>
        </details>

        <div v-if="recurringLoading" class="py-6 text-center text-xs dark:text-dark-txt2 text-light-txt2">{{ t('common.loading') }}</div>
        <div v-else-if="recurringExpensesList.length === 0" class="py-6 text-center text-sm dark:text-dark-txt2 text-light-txt2">{{ t('stats.noRecurringPatterns') }}</div>
        <div v-else class="overflow-x-auto rounded-xl border dark:border-white/[0.07] border-brand-blue/10">
          <table class="w-full min-w-[680px] text-left text-xs">
            <thead class="dark:bg-dark-surf bg-light-surf text-[10px] uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
              <tr>
                <th class="px-3 py-2 font-semibold">{{ t('stats.day') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('stats.category') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('stats.description') }}</th>
                <th class="px-3 py-2 font-semibold text-right">{{ t('stats.amount') }}</th>
                <th class="px-3 py-2 font-semibold text-right">{{ t('stats.action') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, rIdx) in recurringExpensesList"
                :key="row.patternKey || `r-${rIdx}-${row.categoryId ?? 'x'}-${row.subcategoryId ?? 'n'}-${row.dayOfMonth}-${row.amount}-${row.description}`"
                class="border-t dark:border-white/[0.06] border-brand-blue/8 dark:text-dark-txt text-light-txt"
              >
                <td class="px-3 py-2 tabular-nums font-medium">{{ row.dayOfMonth }}</td>
                <td class="px-3 py-2">
                  <span class="mr-1">{{ row.categoryIcon }}</span>{{ row.categoryName }}
                  <span v-if="row.subcategoryName" class="dark:text-dark-txt2 text-light-txt2"> · {{ row.subcategoryName }}</span>
                </td>
                <td class="px-3 py-2 max-w-[14rem] truncate" :title="row.description">{{ row.description }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatEuro(row.amount, false) }}</td>
                <td class="px-3 py-2 text-right">
                  <div class="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-blue/20 text-brand-blue transition-colors hover:bg-brand-blue/10 dark:border-brand-blue/35"
                      :title="t('stats.recategorize')"
                      :aria-label="t('stats.recategorize')"
                      @click="openRecategorizeRecurring(row)"
                    >
                      🏷️
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors disabled:opacity-50"
                      :class="row.isSavings ? 'border-brand-green/40 text-brand-green hover:bg-brand-green/10' : 'border-brand-green/20 text-brand-green hover:bg-brand-green/10'"
                      :title="row.isSavings ? t('stats.unmarkAsSavings') : t('stats.markAsSavings')"
                      :disabled="recurringSavingPatternKey === row.patternKey"
                      @click="toggleRecurringPatternSavings(row)"
                    >
                      <IconPigMoney :icon-class="row.isSavings ? 'h-4 w-4 opacity-100' : 'h-4 w-4 opacity-40'" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/35 text-red-400 transition-colors hover:bg-red-500/10"
                      :title="t('stats.remove')"
                      @click="dismissRecurringPattern(row)"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-5 border-t pt-4 dark:border-white/[0.08] border-brand-blue/10">
          <p class="mb-1 font-display text-sm font-bold dark:text-dark-txt text-light-txt">{{ t('budgets.recurringManualTitle') }}</p>
          <p class="mb-3 text-[10px] leading-relaxed dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recurringManualHint') }}</p>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recurringFromDay') }}</span>
              <input v-model.number="manualRuleDraft.fromDay" type="number" min="1" max="31" class="mw-input w-full" />
            </label>
            <label>
              <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recurringToDay') }}</span>
              <input v-model.number="manualRuleDraft.toDay" type="number" min="1" max="31" class="mw-input w-full" />
            </label>
            <label>
              <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recurringMinAmount') }}</span>
              <input v-model.number="manualRuleDraft.minAmount" type="number" min="0" step="0.01" class="mw-input w-full" />
            </label>
            <label>
              <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recurringMaxAmount') }}</span>
              <input v-model.number="manualRuleDraft.maxAmount" type="number" min="0" step="0.01" class="mw-input w-full" />
            </label>
            <label class="sm:col-span-2">
              <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('stats.category') }}</span>
              <select v-model="manualRuleDraft.categoryId" class="mw-input w-full text-sm">
                <option value="">{{ t('stats.noCategory') }}</option>
                <option v-for="c in expenseCategoriesForRecurring" :key="`mr-cat-${c.id}`" :value="c.id">{{ c.icon }} {{ c.name }}</option>
              </select>
            </label>
            <label class="sm:col-span-2">
              <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('stats.subcategory') }}</span>
              <select v-model="manualRuleDraft.subcategoryId" class="mw-input w-full text-sm" :disabled="!manualRuleDraft.categoryId">
                <option value="">{{ t('stats.noSubcategories') }}</option>
                <option v-for="s in manualRuleSubcategories" :key="`mr-sub-${s.id}`" :value="s.id">{{ s.icon }} {{ s.name }}</option>
              </select>
            </label>
            <label class="sm:col-span-2 lg:col-span-4">
              <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recurringConceptPattern') }}</span>
              <input v-model="manualRuleDraft.conceptPattern" type="text" class="mw-input w-full" />
            </label>
          </div>
          <div class="mt-3 flex flex-wrap justify-end gap-2">
            <button
              v-if="manualRuleEditingId"
              type="button"
              class="rounded-xl px-4 py-2 text-xs font-semibold border dark:border-white/[0.12] border-brand-blue/15"
              @click="resetManualRuleDraft"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-xs font-semibold text-white bg-gradient-to-br from-brand-blue-dark to-brand-blue shadow-glow disabled:opacity-40"
              :disabled="manualRuleSaving"
              @click="saveManualRule"
            >
              {{ manualRuleSaving ? t('common.loading') : (manualRuleEditingId ? t('common.save') : t('budgets.recurringManualCreate')) }}
            </button>
          </div>

          <div v-if="recurringManualRules.length === 0" class="mt-3 text-xs dark:text-dark-txt2 text-light-txt2">
            {{ t('budgets.recurringManualEmpty') }}
          </div>
          <div v-else class="mt-3 overflow-x-auto rounded-xl border dark:border-white/[0.07] border-brand-blue/10">
            <table class="w-full min-w-[780px] text-left text-xs">
              <thead class="dark:bg-dark-surf bg-light-surf text-[10px] uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
                <tr>
                  <th class="px-3 py-2 font-semibold">{{ t('budgets.recurringConceptPattern') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('stats.category') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('budgets.recurringDateRange') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('budgets.recurringAmountRange') }}</th>
                  <th class="px-3 py-2 font-semibold text-right">{{ t('stats.action') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="rule in recurringManualRules"
                  :key="rule.id"
                  class="border-t dark:border-white/[0.06] border-brand-blue/8 dark:text-dark-txt text-light-txt"
                >
                  <td class="px-3 py-2">{{ rule.conceptPattern }}</td>
                  <td class="px-3 py-2">{{ manualRuleCategoryLabel(rule) }}</td>
                  <td class="px-3 py-2 tabular-nums">{{ rule.fromDay }}-{{ rule.toDay }}</td>
                  <td class="px-3 py-2 tabular-nums">{{ manualRuleAmountRangeLabel(rule) }}</td>
                  <td class="px-3 py-2 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-blue/20 text-brand-blue transition-colors hover:bg-brand-blue/10 dark:border-brand-blue/35"
                        :title="t('stats.recategorize')"
                        @click="editManualRule(rule)"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/35 text-red-400 transition-colors hover:bg-red-500/10"
                        :title="t('stats.remove')"
                        @click="deleteManualRule(rule.id)"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-show="activeBudgetTab === 'planned'" class="mw-card -mt-4 rounded-tl-none rounded-tr-2xl md:-mt-6">
        <div class="mb-2 flex items-center gap-1.5">
          <p class="font-display text-sm font-bold dark:text-dark-txt text-light-txt">{{ t('budgets.plannedTitle') }}</p>
          <InfoTip :text="t('budgets.plannedHint')" :aria-label="t('budgets.plannedHint')" />
        </div>
        <div class="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label class="sm:col-span-2">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.plannedName') }}</span>
            <input v-model="plannedDraft.label" type="text" class="mw-input w-full text-sm" maxlength="200" />
          </label>
          <label>
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('stats.amount') }}</span>
            <input v-model.number="plannedDraft.amount" type="number" min="0" step="0.01" class="mw-input w-full tabular-nums" />
          </label>
          <label>
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.plannedKind') }}</span>
            <select v-model="plannedDraft.kind" class="mw-input w-full text-sm">
              <option value="one_shot">{{ t('budgets.plannedKindOneShot') }}</option>
              <option value="recurring">{{ t('budgets.plannedKindRecurring') }}</option>
            </select>
          </label>
          <label v-if="plannedDraft.kind === 'one_shot'" class="sm:col-span-1">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.plannedDueMonth') }}</span>
            <input v-model="plannedDueMonth" type="month" class="mw-input w-full text-sm" />
          </label>
          <label v-if="plannedDraft.kind === 'one_shot'" class="sm:col-span-1">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.plannedDueDay') }}</span>
            <input v-model.number="plannedDraft.dueDay" type="number" min="1" max="31" class="mw-input w-full tabular-nums" />
          </label>
          <template v-if="plannedDraft.kind === 'recurring'">
            <label class="sm:col-span-1">
              <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.plannedCadence') }}</span>
              <select v-model="plannedDraft.cadence" class="mw-input w-full text-sm">
                <option value="quarterly">{{ t('budgets.plannedCadenceQuarterly') }}</option>
                <option value="semiannual">{{ t('budgets.plannedCadenceSemiannual') }}</option>
                <option value="annual">{{ t('budgets.plannedCadenceAnnual') }}</option>
              </select>
            </label>
            <label class="sm:col-span-1">
              <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.plannedAnchorMonth') }}</span>
              <input v-model="plannedAnchorMonth" type="month" class="mw-input w-full text-sm" />
            </label>
          </template>
          <label class="sm:col-span-2">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('stats.category') }}</span>
            <select v-model="plannedDraft.categoryId" class="mw-input w-full text-sm">
              <option value="">{{ t('stats.noCategory') }}</option>
              <option v-for="c in expenseCategoriesForRecurring" :key="`pl-cat-${c.id}`" :value="c.id">{{ c.icon }} {{ c.name }}</option>
            </select>
          </label>
        </div>
        <div class="flex justify-end">
          <button
            type="button"
            class="rounded-xl px-4 py-2 text-xs font-semibold text-white bg-gradient-to-br from-brand-blue-dark to-brand-blue shadow-glow disabled:opacity-40"
            :disabled="plannedSaving"
            @click="createPlannedCommitment"
          >
            {{ plannedSaving ? t('common.loading') : t('budgets.plannedCreate') }}
          </button>
        </div>
        <div v-if="plannedLoading" class="mt-4 text-center text-xs dark:text-dark-txt2 text-light-txt2">{{ t('common.loading') }}</div>
        <div v-else-if="!plannedCommitmentsList.length" class="mt-4 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('budgets.plannedEmpty') }}</div>
        <div v-else class="mt-4 overflow-x-auto rounded-xl border dark:border-white/[0.07] border-brand-blue/10">
          <table class="w-full min-w-[520px] text-left text-xs">
            <thead class="dark:bg-dark-surf bg-light-surf text-[10px] uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
              <tr>
                <th class="px-3 py-2 font-semibold">{{ t('budgets.plannedName') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('stats.amount') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('budgets.plannedKind') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('budgets.plannedWhen') }}</th>
                <th class="px-3 py-2 text-right font-semibold">{{ t('stats.action') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in plannedCommitmentsList" :key="row.id" class="border-t dark:border-white/[0.06] border-brand-blue/8 dark:text-dark-txt text-light-txt">
                <td class="px-3 py-2">{{ row.label }}</td>
                <td class="px-3 py-2 tabular-nums">{{ formatEuro(row.amount, false) }}</td>
                <td class="px-3 py-2">{{ row.kind === 'one_shot' ? t('budgets.plannedKindOneShot') : t('budgets.plannedKindRecurring') }}</td>
                <td class="px-3 py-2 text-[11px] dark:text-dark-txt2 text-light-txt2">{{ plannedWhenLabel(row) }}</td>
                <td class="px-3 py-2 text-right">
                  <button
                    type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/35 text-red-400 transition-colors hover:bg-red-500/10"
                    :title="t('stats.remove')"
                    :disabled="plannedSaving"
                    @click="removePlannedCommitment(row.id)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-show="activeBudgetTab === 'pace'" class="mw-card -mt-4 rounded-tl-none rounded-tr-2xl md:-mt-6">
        <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-1.5">
            <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">{{ t('budgets.paceTitle') }}</p>
            <InfoTip :text="t('budgets.paceInfoGeneral')" :aria-label="t('budgets.paceInfoGeneral')" />
          </div>
          <span class="text-xs dark:text-dark-txt2 text-light-txt2">
            {{ budgetPace ? t('budgets.paceDaysProgress', { elapsed: budgetPace.daysElapsed, total: budgetPace.daysTotal, pct: budgetPace.periodProgressPct }) : '—' }}
          </span>
        </div>

        <div class="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label>
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.paceMode') }}</span>
            <select v-model="paceModeDraft" class="mw-input w-full text-sm">
              <option value="flexible">{{ t('budgets.paceModeFlexible') }}</option>
              <option value="strict">{{ t('budgets.paceModeStrict') }}</option>
              <option value="custom">{{ t('budgets.paceModeCustom') }}</option>
            </select>
          </label>
          <label v-if="paceModeDraft === 'custom'">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.paceWarnPct') }}</span>
            <input v-model.number="paceThresholdDraft.warnPct" type="number" min="1" max="300" class="mw-input w-full tabular-nums" />
          </label>
          <label v-if="paceModeDraft === 'custom'">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.paceRiskPct') }}</span>
            <input v-model.number="paceThresholdDraft.riskPct" type="number" min="1" max="300" class="mw-input w-full tabular-nums" />
          </label>
          <label v-if="paceModeDraft === 'custom'" class="sm:col-span-1">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.paceCriticalPct') }}</span>
            <input v-model.number="paceThresholdDraft.criticalPct" type="number" min="1" max="300" class="mw-input w-full tabular-nums" />
          </label>
        </div>
        <div v-if="paceModeDraft === 'custom'" class="mb-3 flex justify-end">
          <button
            type="button"
            class="rounded-xl px-4 py-2 text-xs font-semibold text-white bg-gradient-to-br from-brand-blue-dark to-brand-blue shadow-glow disabled:opacity-40"
            :disabled="paceSaving || !paceConfigDirty"
            @click="savePaceConfig"
          >
            {{ paceSaving ? t('budgets.savingPaceConfig') : t('budgets.savePaceConfig') }}
          </button>
        </div>

        <p v-if="paceError" class="mb-3 text-xs text-red-400">{{ paceError }}</p>
        <p v-else-if="paceLoading && !budgetPace" class="mb-3 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('common.loading') }}</p>

        <div v-if="budgetPace" class="space-y-3">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
              <div class="flex items-center gap-1.5">
                <p class="font-semibold">{{ t('budgets.paceLinear') }}</p>
                <InfoTip :text="t('budgets.paceInfoLinear')" :aria-label="t('budgets.paceInfoLinear')" />
              </div>
              <p class="mt-1">{{ t('budgets.paceActualVsExpected', { actual: formatEuro(budgetPace.actualSpent, false), expected: formatEuro(budgetPace.expectedSpentLinear, false) }) }}</p>
              <p :class="['mt-1 font-semibold', statusClass(budgetPace.statusLinear)]">
                {{ statusLabel(budgetPace.statusLinear, budgetPace.pacePctLinear, budgetPace.actualSpent, budgetPace.expectedSpentLinear) }} · {{ statusText(budgetPace.actualSpent, budgetPace.expectedSpentLinear) }}
              </p>
            </div>
            <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
              <div class="flex items-center gap-1.5">
                <p class="font-semibold">{{ t('budgets.paceWeighted') }}</p>
                <InfoTip :text="t('budgets.paceInfoWeighted')" :aria-label="t('budgets.paceInfoWeighted')" />
              </div>
              <p class="mt-1">{{ t('budgets.paceActualVsExpected', { actual: formatEuro(budgetPace.actualSpent, false), expected: formatEuro(budgetPace.expectedSpentWeighted, false) }) }}</p>
              <p :class="['mt-1 font-semibold', statusClass(budgetPace.statusWeighted)]">
                {{ statusLabel(budgetPace.statusWeighted, budgetPace.pacePctWeighted, budgetPace.actualSpent, budgetPace.expectedSpentWeighted) }} · {{ statusText(budgetPace.actualSpent, budgetPace.expectedSpentWeighted) }}
              </p>
            </div>
          </div>

          <div class="max-h-56 overflow-y-auto rounded-xl border dark:border-white/[0.08] border-brand-blue/10">
            <table class="w-full text-xs">
              <thead class="dark:bg-dark-surf bg-light-surf dark:text-dark-txt3 text-light-txt3">
                <tr>
                  <th class="px-2 py-2 text-left">{{ t('budgets.category') }}</th>
                  <th class="px-2 py-2 text-right">{{ t('budgets.paceReal') }}</th>
                  <th class="px-2 py-2 text-right">{{ t('budgets.paceExpectedLinear') }}</th>
                  <th class="px-2 py-2 text-right">{{ t('budgets.paceExpectedWeighted') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in budgetPace.categories"
                  :key="`pace-cat-${row.categoryId}`"
                  class="border-t dark:border-white/[0.06] border-brand-blue/8"
                >
                  <td class="px-2 py-2">{{ row.icon }} {{ row.name }}</td>
                  <td class="px-2 py-2 text-right tabular-nums">{{ formatEuro(row.actualSpent, false) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums">{{ formatEuro(row.expectedSpentLinear, false) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums">{{ formatEuro(row.expectedSpentWeighted, false) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-show="activeBudgetTab === 'configure'" class="mw-card -mt-4 rounded-tl-none rounded-tr-2xl md:-mt-6">
        <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">{{ t('budgets.configure') }}</p>
          <button
            type="button"
            class="rounded-xl px-4 py-2 text-xs font-semibold border dark:border-white/[0.12] border-brand-blue/15"
            :disabled="budgetLoading"
            @click="reloadBudgets"
          >
            {{ budgetLoading ? t('common.loading') : t('budgets.reload') }}
          </button>
        </div>

        <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label class="block sm:col-span-1">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.total') }}</span>
            <input
              v-model.number="budgetTotalDraft"
              type="number"
              min="0"
              step="0.01"
              class="mw-input w-full tabular-nums"
            />
          </label>
          <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10 sm:col-span-2">
            <p class="dark:text-dark-txt2 text-light-txt2">
              {{ t('budgets.currentSum') }}:
              <span class="font-semibold dark:text-dark-txt text-light-txt">{{ formatEuro(categoryBudgetSum, false) }}</span>
            </p>
            <p class="mt-1 dark:text-dark-txt3 text-light-txt3">{{ t('budgets.totalHint') }}</p>
          </div>
        </div>

        <div class="space-y-3">
          <details
            v-for="cat in expenseCategories"
            :key="cat.id"
            class="rounded-xl border dark:border-white/[0.08] border-brand-blue/10"
          >
            <summary class="cursor-pointer list-none px-3 py-2">
              <div class="flex items-center gap-3">
                <input
                  type="checkbox"
                  class="accent-brand-blue"
                  :checked="!excludedCategoryIds.has(cat.id!)"
                  @click.stop
                  @change="onToggleCategoryIncluded(cat.id!, ($event.target as HTMLInputElement).checked)"
                />
                <span class="text-base">{{ cat.icon }}</span>
                <span class="flex-1 min-w-0 truncate text-sm font-semibold dark:text-dark-txt text-light-txt">{{ cat.name }}</span>
                <input
                  v-model.number="categoryBudgetDraft[cat.id!]"
                  type="number"
                  min="0"
                  step="0.01"
                  class="mw-input w-32 text-right tabular-nums"
                  :disabled="excludedCategoryIds.has(cat.id!)"
                  @click.stop
                />
              </div>
            </summary>
            <div class="space-y-2 border-t px-3 py-3 dark:border-white/[0.06] border-brand-blue/8">
              <p class="text-[11px] dark:text-dark-txt2 text-light-txt2">{{ t('budgets.subcategories') }}</p>
              <div v-if="!cat.subcategories?.length" class="text-xs dark:text-dark-txt3 text-light-txt3">
                {{ t('budgets.noSubcategories') }}
              </div>
              <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div v-for="sub in cat.subcategories" :key="sub.id" class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    class="accent-brand-blue"
                    :disabled="excludedCategoryIds.has(cat.id!)"
                    :checked="!excludedSubcategoryIds.has(sub.id)"
                    @change="onToggleSubcategoryIncluded(sub.id, ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="flex-1 min-w-0 truncate text-xs dark:text-dark-txt2 text-light-txt2">{{ sub.icon }} {{ sub.name }}</span>
                  <input
                    v-model.number="subcategoryBudgetDraft[cat.id!][sub.id]"
                    type="number"
                    min="0"
                    step="0.01"
                    class="mw-input w-28 text-right tabular-nums"
                    :disabled="excludedCategoryIds.has(cat.id!) || excludedSubcategoryIds.has(sub.id)"
                  />
                </div>
              </div>
              <p class="text-[11px] dark:text-dark-txt3 text-light-txt3">
                {{ t('budgets.subSum') }}: {{ formatEuro(subcategorySum(cat.id!), false) }}
              </p>
            </div>
          </details>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="rounded-xl px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-br from-brand-blue-dark to-brand-blue shadow-glow transition-opacity hover:opacity-90 disabled:opacity-40"
            :disabled="budgetSaving || budgetLoading || !hasChanges"
            @click="saveBudgets"
          >
            {{ budgetSaving ? t('budgets.saving') : t('budgets.save') }}
          </button>
        </div>
      </div>

      <div v-show="activeBudgetTab === 'recommendations'" class="mw-card -mt-4 rounded-tl-none rounded-tr-2xl md:-mt-6">
        <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">{{ t('budgets.recommendationsTitle') }}</p>
        <p class="mt-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recommendationsBody') }}</p>
        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label class="sm:col-span-1">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recoProfile') }}</span>
            <select v-model="recoProfile" class="mw-input w-full text-sm">
              <option value="conservative">{{ t('budgets.recoProfileConservative') }}</option>
              <option value="balanced">{{ t('budgets.recoProfileBalanced') }}</option>
              <option value="flexible">{{ t('budgets.recoProfileFlexible') }}</option>
            </select>
            <p class="mt-1 text-[11px] leading-relaxed dark:text-dark-txt3 text-light-txt3">
              {{ selectedProfileDescription }}
            </p>
          </label>
          <label class="sm:col-span-1">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recoSavingsTarget') }}</span>
            <input v-model.number="recoTargetSavingsPct" type="number" min="5" max="60" step="1" class="mw-input w-full tabular-nums" />
            <p class="mt-1 text-[11px] dark:text-dark-txt3 text-light-txt3">
              {{ t('budgets.recoAutoTargetHint', { percent: recommendedSavingsTargetPct }) }}
            </p>
          </label>
          <div class="sm:col-span-2 flex items-end justify-end gap-2">
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-xs font-semibold border dark:border-white/[0.12] border-brand-blue/15"
              :disabled="recoLoading"
              @click="loadRecommendations"
            >
              {{ recoLoading ? t('common.loading') : t('budgets.generateRecommendations') }}
            </button>
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-xs font-semibold text-white bg-gradient-to-br from-brand-blue-dark to-brand-blue shadow-glow disabled:opacity-40"
              :disabled="recoApplying || !recommendations"
              @click="applyAllRecommendations"
            >
              {{ recoApplying ? t('budgets.applyingRecommendations') : t('budgets.applyAllRecommendations') }}
            </button>
          </div>
        </div>

        <p v-if="recoError" class="mt-3 text-xs text-red-400">{{ recoError }}</p>

        <div v-if="recommendations" class="mt-4 space-y-3">
          <div class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
            <p>{{ t('budgets.recoIncomeAvg') }}: <strong>{{ formatEuro(recommendations.incomeAverage, false) }}</strong></p>
            <p>{{ t('budgets.recoSuggestedTotal') }}: <strong>{{ formatEuro(recommendations.suggestedTotalBudget, false) }}</strong></p>
            <p>{{ t('budgets.recoEstimatedSavings') }}: <strong>{{ formatEuro(recommendations.estimatedSavingsAmount, false) }}</strong></p>
          </div>
          <div v-if="recommendations.horizons" class="rounded-xl border px-3 py-2 text-xs dark:border-white/[0.08] border-brand-blue/10">
            <div class="mb-2 flex items-center gap-1.5">
              <p class="font-semibold dark:text-dark-txt text-light-txt">{{ t('budgets.recoHorizonsTitle') }}</p>
              <InfoTip :text="t('budgets.recoHorizonsInfo')" :aria-label="t('budgets.recoHorizonsInfo')" />
            </div>
            <p>{{ t('budgets.recoHorizonMonth') }}: <strong>{{ formatEuro(recommendations.horizons.monthlySuggestedTotal, false) }}</strong></p>
            <p>{{ t('budgets.recoHorizonSemester') }}: <strong>{{ formatEuro(recommendations.horizons.semesterSuggestedTotal, false) }}</strong></p>
            <p>{{ t('budgets.recoHorizonYear') }}: <strong>{{ formatEuro(recommendations.horizons.annualSuggestedTotal, false) }}</strong></p>
          </div>

          <details v-for="line in recommendations.lines" :key="`reco-${line.categoryId}`" class="rounded-xl border dark:border-white/[0.08] border-brand-blue/10">
            <summary class="cursor-pointer list-none px-3 py-2">
              <div class="flex items-center gap-2">
                <span>{{ line.icon }}</span>
                <span class="flex-1 min-w-0 truncate text-sm font-semibold">{{ line.name }}</span>
                <span class="text-xs dark:text-dark-txt2 text-light-txt2">
                  {{ formatEuro(line.currentBudget, false) }} → {{ formatEuro(line.suggestedBudget, false) }}
                  {{ t('budgets.recoAvgMonthlyCategory', { amount: formatEuro(line.monthlyAverageSpent, false) }) }}
                </span>
                <button
                  type="button"
                  class="rounded-lg px-2 py-1 text-[11px] border dark:border-white/[0.12] border-brand-blue/15"
                  @click.stop="applyCategoryRecommendation(line.categoryId)"
                >
                  {{ t('budgets.applyCategoryRecommendation') }}
                </button>
              </div>
            </summary>
            <div class="space-y-2 border-t px-3 py-3 dark:border-white/[0.06] border-brand-blue/8">
              <p class="text-xs dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recoConfidence') }}: {{ line.confidence.toFixed(0) }}%</p>
              <ul class="space-y-1">
                <li v-for="reason in line.reasons" :key="reason" class="text-xs dark:text-dark-txt3 text-light-txt3">- {{ reason }}</li>
              </ul>
              <div v-if="line.subcategories.length" class="space-y-1 pt-1">
                <div v-for="sub in line.subcategories" :key="sub.subcategoryId" class="flex items-center gap-2 text-xs">
                  <span class="flex-1 min-w-0 truncate">
                    {{ sub.icon }} {{ sub.name }} ({{ formatEuro(sub.currentBudget, false) }} → {{ formatEuro(sub.suggestedBudget, false) }}
                    {{ t('budgets.recoAvgMonthlySubcategory', { amount: formatEuro(sub.monthlyAverageSpent, false) }) }})
                  </span>
                  <button
                    type="button"
                    class="rounded-lg px-2 py-1 border dark:border-white/[0.12] border-brand-blue/15"
                    @click.stop="applySubcategoryRecommendation(sub.subcategoryId)"
                  >
                    {{ t('budgets.applySubcategoryRecommendation') }}
                  </button>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="recategorizeModalRow"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-recategorize-title"
        @click.self="recategorizeModalRow = null"
      >
        <div
          class="w-full max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-brand-blue/10 bg-light-card p-5 shadow-xl dark:border-white/[0.07] dark:bg-dark-card sm:max-w-md sm:rounded-2xl"
          @click.stop
        >
          <p id="recurring-recategorize-title" class="font-display text-base font-bold dark:text-dark-txt text-light-txt">
            {{ t('stats.recategorizeTitle') }}
          </p>
          <p class="mt-2 text-xs leading-relaxed dark:text-dark-txt2 text-light-txt2">
            {{ t('stats.recategorizeHint') }}
          </p>
          <label class="mt-3 block">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('stats.category') }}</span>
            <select v-model="recategorizeCategoryId" class="mw-input w-full text-sm">
              <option value="">{{ t('stats.noCategory') }}</option>
              <option v-for="c in expenseCategoriesForRecurring" :key="`b-rc-${c.id}`" :value="c.id">{{ c.icon }} {{ c.name }}</option>
            </select>
          </label>
          <label v-if="recategorizeCategoryId" class="mt-3 block">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('stats.subcategory') }}</span>
            <select v-model="recategorizeSubcategoryId" class="mw-input w-full text-sm">
              <option value="">{{ t('stats.noSubcategories') }}</option>
              <option v-for="s in recategorizeSubcategoryOptions" :key="`b-rs-${s.id}`" :value="s.id">{{ s.icon }} {{ s.name }}</option>
            </select>
          </label>
          <div class="mt-5 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-xl border border-brand-blue/15 py-3 text-sm font-semibold dark:border-white/[0.08] dark:text-dark-txt2"
              :disabled="recategorizeBusy"
              @click="recategorizeModalRow = null"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="flex-1 rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              :disabled="recategorizeBusy"
              @click="confirmRecategorizeRecurring"
            >
              {{ recategorizeBusy ? t('stats.applying') : t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/services/api'
import type {
  BudgetPaceDto,
  BudgetPaceMode,
  BudgetRecommendationProfile,
  BudgetRecommendationResult,
  RecurringManualRuleDto,
  StatsRecurringExpenseDto,
  PlannedCommitmentDto,
} from '@/services/api'
import { resolveApiErrorI18nKey } from '@/utils/apiErrorMap'
import { useCurrency } from '@/composables/useCurrency'
import { paceSimpleText, paceStatusClass, paceStatusLabel } from '@/composables/usePaceStatus'
import { useToast } from '@/composables/useToast'
import { fiscalYmForDate, monthCycleConfigFromSession } from '@/utils/monthPeriod'
import InfoTip from '@/components/InfoTip.vue'
import IconPigMoney from '@/icons/IconPigMoney.vue'
import BookmarkTabs from '@/components/BookmarkTabs.vue'

type BudgetTabId = 'configure' | 'pace' | 'recurring' | 'planned' | 'recommendations'

const store = useWalletStore()
const { t } = useI18n()
const { formatEuro } = useCurrency()
const toast = useToast()
const activeBudgetTab = ref<BudgetTabId>('configure')
const budgetTabs = computed<Array<{ id: string; label: string }>>(() => [
  { id: 'configure', label: t('budgets.configure') },
  { id: 'pace', label: t('budgets.paceTitle') },
  { id: 'recurring', label: t('stats.recurringExpenses') },
  { id: 'planned', label: t('budgets.plannedTab') },
  { id: 'recommendations', label: t('budgets.recommendationsTitle') },
])

const budgetLoading = ref(false)
const budgetSaving = ref(false)
const budgetError = ref<string | null>(null)
const recoLoading = ref(false)
const recoApplying = ref(false)
const recoError = ref<string | null>(null)
const recoProfile = ref<BudgetRecommendationProfile>('balanced')
const recoTargetSavingsPct = ref(20)
const recommendations = ref<BudgetRecommendationResult | null>(null)
const recurringLoading = ref(false)
const plannedCommitmentsList = ref<PlannedCommitmentDto[]>([])
const plannedLoading = ref(false)
const plannedSaving = ref(false)
const plannedDueMonth = ref('')
const plannedAnchorMonth = ref('')
const plannedDraft = ref({
  label: '',
  amount: 0,
  kind: 'one_shot' as 'one_shot' | 'recurring',
  dueDay: null as number | null,
  cadence: 'annual' as 'quarterly' | 'semiannual' | 'annual',
  categoryId: '',
})
const recurringExpensesList = ref<StatsRecurringExpenseDto[]>([])
const recurringExcludedCategoryIds = ref<string[]>([])
const recurringSavingsCategoryIds = ref<string[]>([])
const recurringSaving = ref(false)
const recurringSavingPatternKey = ref<string | null>(null)
const recurringManualRules = ref<RecurringManualRuleDto[]>([])
const manualRuleSaving = ref(false)
const manualRuleEditingId = ref<string | null>(null)
const manualRuleDraft = ref({
  conceptPattern: '',
  fromDay: 1,
  toDay: 31,
  minAmount: null as number | null,
  maxAmount: null as number | null,
  categoryId: '',
  subcategoryId: '',
})
const recategorizeModalRow = ref<StatsRecurringExpenseDto | null>(null)
const recategorizeCategoryId = ref('')
const recategorizeSubcategoryId = ref('')
const recategorizeBusy = ref(false)
const budgetTotalDraft = ref(0)
const categoryBudgetDraft = ref<Record<string, number>>({})
const subcategoryBudgetDraft = ref<Record<string, Record<string, number>>>({})
const loadedBudgetMap = ref<Record<string, { amount: number }>>({})
const loadedSubcategoryBudgetMap = ref<Record<string, number>>({})
const excludedCategoryIds = ref<Set<string>>(new Set())
const excludedSubcategoryIds = ref<Set<string>>(new Set())
const loadedExcludedCategoryIds = ref<Set<string>>(new Set())
const loadedExcludedSubcategoryIds = ref<Set<string>>(new Set())
const budgetPace = ref<BudgetPaceDto | null>(null)
const paceLoading = ref(false)
const paceSaving = ref(false)
const suppressAutoPaceSave = ref(false)
const paceError = ref<string | null>(null)
const paceModeDraft = ref<BudgetPaceMode>('flexible')
const paceThresholdDraft = ref({ warnPct: 10, riskPct: 20, criticalPct: 35 })

const budgetMonth = computed(() => fiscalYmForDate(new Date(), monthCycleConfigFromSession(store.user)))
const allBudgetCategories = computed(() =>
  store.categories.filter((c) => {
    if (!c.id) return false
    if (c.categoryType !== 'income') return true
    const spent = Number(c.spent ?? 0)
    const income = Number(c.incomeInCategory ?? 0)
    return spent > income
  })
)
const expenseCategories = computed(() => allBudgetCategories.value)
const expenseCategoriesForRecurring = computed(() =>
  store.categories.filter(c => Boolean(c.id) && c.categoryType !== 'income')
)
const manualRuleSubcategories = computed(() => {
  const category = expenseCategoriesForRecurring.value.find(c => c.id === manualRuleDraft.value.categoryId)
  return category?.subcategories ?? []
})
const recategorizeSubcategoryOptions = computed(() => {
  const category = expenseCategoriesForRecurring.value.find(c => c.id === recategorizeCategoryId.value)
  return category?.subcategories ?? []
})
const categoryBudgetSum = computed(() =>
  expenseCategories.value.reduce((sum, c) => sum + Math.max(0, Number(categoryBudgetDraft.value[c.id!] ?? 0)), 0)
)

const budgetDirty = computed(() => {
  if (Math.abs(categoryBudgetSum.value - Math.max(0, Number(budgetTotalDraft.value || 0))) > 0.009) return true
  return expenseCategories.value.some((cat) => {
    const id = cat.id!
    const loaded = loadedBudgetMap.value[id]
    const current = Math.max(0, Number(categoryBudgetDraft.value[id] ?? 0))
    if (Math.abs((loaded?.amount ?? 0) - current) > 0.009) return true
    const currentSubs = subcategoryBudgetDraft.value[id] ?? {}
    const subIds = new Set([...Object.keys(currentSubs), ...(cat.subcategories ?? []).map((s) => s.id)])
    for (const subId of subIds) {
      const loadedSub = loadedSubcategoryBudgetMap.value[subId] ?? 0
      if (Math.abs(loadedSub - (Number(currentSubs[subId] ?? 0) || 0)) > 0.009) return true
    }
    return false
  })
})
const excludeDirty = computed(() => {
  if (excludedCategoryIds.value.size !== loadedExcludedCategoryIds.value.size) return true
  if (excludedSubcategoryIds.value.size !== loadedExcludedSubcategoryIds.value.size) return true
  for (const id of excludedCategoryIds.value) if (!loadedExcludedCategoryIds.value.has(id)) return true
  for (const id of excludedSubcategoryIds.value) if (!loadedExcludedSubcategoryIds.value.has(id)) return true
  return false
})
const paceConfigDirty = computed(() => {
  const mode = store.user?.budgetPaceMode ?? 'flexible'
  if (paceModeDraft.value !== mode) return true
  if (paceModeDraft.value !== 'custom') return false
  const current = store.user?.budgetPaceThresholds ?? { warnPct: 10, riskPct: 20, criticalPct: 35 }
  return (
    Math.abs(Number(current.warnPct) - Number(paceThresholdDraft.value.warnPct)) > 0.001 ||
    Math.abs(Number(current.riskPct) - Number(paceThresholdDraft.value.riskPct)) > 0.001 ||
    Math.abs(Number(current.criticalPct) - Number(paceThresholdDraft.value.criticalPct)) > 0.001
  )
})
const hasChanges = computed(() => budgetDirty.value || excludeDirty.value || paceConfigDirty.value)
const PROFILE_DEFAULT_TARGET_PCT: Record<BudgetRecommendationProfile, number> = {
  conservative: 25,
  balanced: 20,
  flexible: 12,
}
const recommendedSavingsTargetPct = computed(() => PROFILE_DEFAULT_TARGET_PCT[recoProfile.value])
const selectedProfileDescription = computed(() => {
  if (recoProfile.value === 'conservative') return t('budgets.recoProfileConservativeDesc')
  if (recoProfile.value === 'flexible') return t('budgets.recoProfileFlexibleDesc')
  return t('budgets.recoProfileBalancedDesc')
})

function subcategorySum(categoryId: string): number {
  const row = subcategoryBudgetDraft.value[categoryId] ?? {}
  return Object.values(row).reduce((sum, v) => sum + Math.max(0, Number(v || 0)), 0)
}

function statusClass(status: string): string {
  return paceStatusClass(status)
}

function statusLabel(status: string, pacePct: number, actualSpent?: number, expectedSpent?: number): string {
  return paceStatusLabel(t, 'budgets', status, pacePct, actualSpent, expectedSpent)
}

function statusText(actualSpent?: number, expectedSpent?: number): string {
  return paceSimpleText(t, 'budgets', actualSpent, expectedSpent)
}

async function loadBudgetPace(): Promise<void> {
  paceLoading.value = true
  paceError.value = null
  try {
    budgetPace.value = await api.getBudgetPace(budgetMonth.value)
  } catch (e: unknown) {
    paceError.value = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
  } finally {
    paceLoading.value = false
  }
}

function buildPaceProfilePayload(): {
  budgetPaceMode: BudgetPaceMode
  budgetPaceThresholds?: { warnPct: number; riskPct: number; criticalPct: number }
} {
  const payload: {
    budgetPaceMode: BudgetPaceMode
    budgetPaceThresholds?: { warnPct: number; riskPct: number; criticalPct: number }
  } = { budgetPaceMode: paceModeDraft.value }

  if (paceModeDraft.value === 'custom') {
    const warnPct = Number(paceThresholdDraft.value.warnPct)
    const riskPct = Number(paceThresholdDraft.value.riskPct)
    const criticalPct = Number(paceThresholdDraft.value.criticalPct)
    if (!(warnPct < riskPct && riskPct < criticalPct)) {
      throw new Error('PACE_THRESHOLD_ORDER_INVALID')
    }
    payload.budgetPaceThresholds = { warnPct, riskPct, criticalPct }
  }
  return payload
}

async function savePaceConfig(): Promise<void> {
  if (!paceConfigDirty.value) return
  paceSaving.value = true
  paceError.value = null
  try {
    const payload = buildPaceProfilePayload()
    store.user = await api.updateProfile(payload)
    await loadBudgetPace()
    toast.success(t('budgets.saved'))
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'PACE_THRESHOLD_ORDER_INVALID') {
      const msg = t('budgets.paceThresholdOrderError')
      paceError.value = msg
      toast.error(msg)
    } else {
      const msg = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
      paceError.value = msg
      toast.error(msg)
    }
  } finally {
    paceSaving.value = false
  }
}

function distributeToTotal(total: number): void {
  const categories = expenseCategories.value
  if (!categories.length) return
  const current = categoryBudgetSum.value
  if (current <= 0) {
    const even = Math.round((total / categories.length) * 100) / 100
    const next: Record<string, number> = { ...categoryBudgetDraft.value }
    categories.forEach((c, idx) => {
      next[c.id!] = idx === categories.length - 1
        ? Math.round((total - even * (categories.length - 1)) * 100) / 100
        : even
    })
    categoryBudgetDraft.value = next
    return
  }
  const next: Record<string, number> = {}
  let acc = 0
  categories.forEach((c, idx) => {
    if (idx === categories.length - 1) {
      next[c.id!] = Math.max(0, Math.round((total - acc) * 100) / 100)
    } else {
      const raw = (Number(categoryBudgetDraft.value[c.id!] ?? 0) / current) * total
      const val = Math.max(0, Math.round(raw * 100) / 100)
      next[c.id!] = val
      acc += val
    }
  })
  categoryBudgetDraft.value = next
}

async function reloadBudgets(): Promise<void> {
  budgetLoading.value = true
  budgetError.value = null
  try {
    await store.loadCategories()
    suppressAutoPaceSave.value = true
    paceModeDraft.value = (store.user?.budgetPaceMode ?? 'flexible')
    const th = store.user?.budgetPaceThresholds ?? { warnPct: 10, riskPct: 20, criticalPct: 35 }
    paceThresholdDraft.value = { warnPct: Number(th.warnPct), riskPct: Number(th.riskPct), criticalPct: Number(th.criticalPct) }
    excludedCategoryIds.value = new Set(store.user?.budgetExcludedCategoryIds ?? [])
    excludedSubcategoryIds.value = new Set(store.user?.budgetExcludedSubcategoryIds ?? [])
    loadedExcludedCategoryIds.value = new Set(excludedCategoryIds.value)
    loadedExcludedSubcategoryIds.value = new Set(excludedSubcategoryIds.value)
    const [budgets, subBudgets] = await Promise.all([
      api.getBudgets(budgetMonth.value),
      api.getSubcategoryBudgets(budgetMonth.value),
    ])
    const byCategory: Record<string, { amount: number }> = {}
    for (const b of budgets) byCategory[b.categoryId] = { amount: Number(b.amount) || 0 }
    const bySubcategory: Record<string, number> = {}
    for (const b of subBudgets) bySubcategory[b.subcategoryId] = Number(b.amount) || 0
    loadedBudgetMap.value = byCategory
    loadedSubcategoryBudgetMap.value = bySubcategory

    const catDraft: Record<string, number> = {}
    const subDraft: Record<string, Record<string, number>> = {}
    for (const cat of expenseCategories.value) {
      const id = cat.id!
      catDraft[id] = Number(byCategory[id]?.amount ?? 0)
      subDraft[id] = {}
      for (const sub of cat.subcategories ?? []) {
        subDraft[id][sub.id] = Number(bySubcategory[sub.id] ?? 0)
      }
    }
    categoryBudgetDraft.value = catDraft
    subcategoryBudgetDraft.value = subDraft
    budgetTotalDraft.value = categoryBudgetSum.value
    await loadBudgetPace()
  } catch (e: unknown) {
    const msg = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
    budgetError.value = msg
    toast.error(msg)
  } finally {
    suppressAutoPaceSave.value = false
    budgetLoading.value = false
  }
}

async function saveBudgets(): Promise<void> {
  budgetSaving.value = true
  budgetError.value = null
  try {
    if (excludeDirty.value || paceConfigDirty.value) {
      const profilePayload: {
        budgetExcludedCategoryIds?: string[]
        budgetExcludedSubcategoryIds?: string[]
        budgetPaceMode?: BudgetPaceMode
        budgetPaceThresholds?: { warnPct: number; riskPct: number; criticalPct: number }
      } = {}
      if (excludeDirty.value) {
        profilePayload.budgetExcludedCategoryIds = Array.from(excludedCategoryIds.value)
        profilePayload.budgetExcludedSubcategoryIds = Array.from(excludedSubcategoryIds.value)
      }
      if (paceConfigDirty.value) {
        Object.assign(profilePayload, buildPaceProfilePayload())
      }
      await api.updateProfile(profilePayload)
      await store.loadUser()
      loadedExcludedCategoryIds.value = new Set(excludedCategoryIds.value)
      loadedExcludedSubcategoryIds.value = new Set(excludedSubcategoryIds.value)
    }

    const targetTotal = Math.max(0, Number(budgetTotalDraft.value || 0))
    distributeToTotal(targetTotal)

    const payloadsCategory: Array<{ categoryId: string; amount: number; month: string }> = []
    const payloadsSubcategory: Array<{ subcategoryId: string; amount: number; month: string }> = []
    for (const cat of allBudgetCategories.value) {
      const categoryId = cat.id!
      if (excludedCategoryIds.value.has(categoryId)) {
        payloadsCategory.push({ categoryId, amount: 0, month: budgetMonth.value })
        for (const sub of cat.subcategories ?? []) {
          payloadsSubcategory.push({ subcategoryId: sub.id, amount: 0, month: budgetMonth.value })
        }
        continue
      }
      const amount = Math.max(0, Number(categoryBudgetDraft.value[categoryId] ?? 0))
      const subRows = subcategoryBudgetDraft.value[categoryId] ?? {}
      const subSum = Object.entries(subRows).reduce((sum, [subId, v]) => (
        excludedSubcategoryIds.value.has(subId) ? sum : sum + Math.max(0, Number(v || 0))
      ), 0)
      if (subSum - amount > 0.009) {
        const msg = t('budgets.subOverCategory', { category: cat.name })
        budgetError.value = msg
        toast.error(msg)
        budgetSaving.value = false
        return
      }
      for (const [subId, val] of Object.entries(subRows)) {
        if (excludedSubcategoryIds.value.has(subId)) {
          payloadsSubcategory.push({ subcategoryId: subId, amount: 0, month: budgetMonth.value })
          continue
        }
        const n = Math.max(0, Math.round(Number(val || 0) * 100) / 100)
        payloadsSubcategory.push({ subcategoryId: subId, amount: n, month: budgetMonth.value })
      }
      payloadsCategory.push({ categoryId, amount, month: budgetMonth.value })
    }

    await Promise.all([
      ...payloadsCategory.map((p) => api.upsertBudget(p)),
      ...payloadsSubcategory.map((p) => api.upsertSubcategoryBudget(p)),
    ])
    await store.loadBudgets(budgetMonth.value)
    await reloadBudgets()
    await loadBudgetPace()
    toast.success(t('budgets.saved'))
  } catch (e: unknown) {
    const msg = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
    budgetError.value = msg
    toast.error(msg)
  } finally {
    budgetSaving.value = false
  }
}

async function loadRecommendations(): Promise<void> {
  recoLoading.value = true
  recoError.value = null
  try {
    recommendations.value = await api.getBudgetRecommendations({
      month: budgetMonth.value,
      profile: recoProfile.value,
      targetSavingsRate: Math.max(0.05, Math.min(0.6, Number(recoTargetSavingsPct.value || 20) / 100)),
    })
  } catch (e: unknown) {
    recoError.value = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
    toast.error(recoError.value)
  } finally {
    recoLoading.value = false
  }
}

async function applyAllRecommendations(): Promise<void> {
  recoApplying.value = true
  recoError.value = null
  try {
    await api.applyBudgetRecommendations({
      month: budgetMonth.value,
      profile: recoProfile.value,
      targetSavingsRate: Math.max(0.05, Math.min(0.6, Number(recoTargetSavingsPct.value || 20) / 100)),
      mode: 'all',
    })
    await reloadBudgets()
    await loadRecommendations()
    toast.success(t('budgets.saved'))
  } catch (e: unknown) {
    recoError.value = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
    toast.error(recoError.value)
  } finally {
    recoApplying.value = false
  }
}

async function applyCategoryRecommendation(categoryId: string): Promise<void> {
  recoApplying.value = true
  recoError.value = null
  try {
    await api.applyBudgetRecommendations({
      month: budgetMonth.value,
      profile: recoProfile.value,
      targetSavingsRate: Math.max(0.05, Math.min(0.6, Number(recoTargetSavingsPct.value || 20) / 100)),
      mode: 'categories',
      categoryIds: [categoryId],
    })
    await reloadBudgets()
    await loadRecommendations()
    toast.success(t('budgets.saved'))
  } catch (e: unknown) {
    recoError.value = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
    toast.error(recoError.value)
  } finally {
    recoApplying.value = false
  }
}

async function applySubcategoryRecommendation(subcategoryId: string): Promise<void> {
  recoApplying.value = true
  recoError.value = null
  try {
    await api.applyBudgetRecommendations({
      month: budgetMonth.value,
      profile: recoProfile.value,
      targetSavingsRate: Math.max(0.05, Math.min(0.6, Number(recoTargetSavingsPct.value || 20) / 100)),
      mode: 'subcategories',
      subcategoryIds: [subcategoryId],
    })
    await reloadBudgets()
    await loadRecommendations()
    toast.success(t('budgets.saved'))
  } catch (e: unknown) {
    recoError.value = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
    toast.error(recoError.value)
  } finally {
    recoApplying.value = false
  }
}

async function loadRecurringOverview(): Promise<void> {
  recurringLoading.value = true
  try {
    const data = await api.getStatsMonthOverview(budgetMonth.value)
    recurringExpensesList.value = data.recurringExpenses ?? []
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'errors.common.unknown')))
  } finally {
    recurringLoading.value = false
  }
}

async function loadRecurringManualRules(): Promise<void> {
  try {
    recurringManualRules.value = await api.getRecurringManualRules()
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'errors.common.unknown')))
  }
}

function plannedWhenLabel(row: PlannedCommitmentDto): string {
  if (row.kind === 'one_shot') {
    const ym = row.dueYm ?? ''
    if (!ym) return '—'
    const day = row.dueDay != null ? ` · ${t('stats.day')} ${row.dueDay}` : ''
    return `${ym}${day}`
  }
  const cad = row.cadence ?? ''
  const anchor = row.anchorYm ? ` · ${row.anchorYm}` : ''
  return `${cad}${anchor}`
}

async function loadPlannedCommitments(): Promise<void> {
  plannedLoading.value = true
  try {
    plannedCommitmentsList.value = await api.getPlannedCommitments()
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'errors.common.unknown')))
  } finally {
    plannedLoading.value = false
  }
}

function resetPlannedDraft(): void {
  plannedDraft.value = {
    label: '',
    amount: 0,
    kind: 'one_shot',
    dueDay: null,
    cadence: 'annual',
    categoryId: '',
  }
  plannedDueMonth.value = budgetMonth.value
  plannedAnchorMonth.value = ''
}

async function createPlannedCommitment(): Promise<void> {
  const d = plannedDraft.value
  if (!d.label.trim()) {
    toast.error(t('budgets.plannedNameRequired'))
    return
  }
  if (d.kind === 'one_shot' && !plannedDueMonth.value) {
    toast.error(t('budgets.plannedDueRequired'))
    return
  }
  plannedSaving.value = true
  try {
    await api.createPlannedCommitment({
      label: d.label.trim(),
      amount: Number(d.amount),
      kind: d.kind,
      dueYm: d.kind === 'one_shot' ? plannedDueMonth.value : null,
      dueDay: d.kind === 'one_shot' && d.dueDay != null && d.dueDay > 0 ? Number(d.dueDay) : null,
      cadence: d.kind === 'recurring' ? d.cadence : null,
      anchorYm: d.kind === 'recurring' && plannedAnchorMonth.value ? plannedAnchorMonth.value : null,
      categoryId: d.categoryId || null,
      subcategoryId: null,
    })
    await loadPlannedCommitments()
    resetPlannedDraft()
    toast.success(t('common.saved'))
    if (recommendations.value) void loadRecommendations()
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'errors.common.unknown')))
  } finally {
    plannedSaving.value = false
  }
}

async function removePlannedCommitment(id: string): Promise<void> {
  plannedSaving.value = true
  try {
    await api.deletePlannedCommitment(id)
    plannedCommitmentsList.value = plannedCommitmentsList.value.filter((x) => x.id !== id)
    toast.success(t('common.saved'))
    if (recommendations.value) void loadRecommendations()
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'errors.common.unknown')))
  } finally {
    plannedSaving.value = false
  }
}

function resetManualRuleDraft(): void {
  manualRuleEditingId.value = null
  manualRuleDraft.value = {
    conceptPattern: '',
    fromDay: 1,
    toDay: 31,
    minAmount: null,
    maxAmount: null,
    categoryId: '',
    subcategoryId: '',
  }
}

function editManualRule(rule: RecurringManualRuleDto): void {
  manualRuleEditingId.value = rule.id
  manualRuleDraft.value = {
    conceptPattern: rule.conceptPattern,
    fromDay: rule.fromDay,
    toDay: rule.toDay,
    minAmount: rule.minAmount,
    maxAmount: rule.maxAmount,
    categoryId: rule.categoryId,
    subcategoryId: rule.subcategoryId ?? '',
  }
}

async function saveManualRule(): Promise<void> {
  const d = manualRuleDraft.value
  if (!d.categoryId || !d.conceptPattern.trim()) {
    toast.error(t('budgets.recurringManualRequiredError'))
    return
  }
  if (d.minAmount == null && d.maxAmount == null) {
    toast.error(t('budgets.recurringManualAmountRequired'))
    return
  }
  if (d.minAmount != null && d.maxAmount != null && Number(d.minAmount) > Number(d.maxAmount)) {
    toast.error(t('budgets.recurringManualAmountOrderError'))
    return
  }
  manualRuleSaving.value = true
  try {
    const payload = {
      conceptPattern: d.conceptPattern.trim(),
      fromDay: Number(d.fromDay),
      toDay: Number(d.toDay),
      minAmount: d.minAmount == null ? null : Number(d.minAmount),
      maxAmount: d.maxAmount == null ? null : Number(d.maxAmount),
      categoryId: d.categoryId,
      subcategoryId: d.subcategoryId || null,
    }
    if (manualRuleEditingId.value) {
      await api.updateRecurringManualRule(manualRuleEditingId.value, payload)
    } else {
      await api.createRecurringManualRule(payload)
    }
    await loadRecurringManualRules()
    resetManualRuleDraft()
    toast.success(t('common.saved'))
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'errors.common.unknown')))
  } finally {
    manualRuleSaving.value = false
  }
}

async function deleteManualRule(ruleId: string): Promise<void> {
  try {
    await api.deleteRecurringManualRule(ruleId)
    recurringManualRules.value = recurringManualRules.value.filter((r) => r.id !== ruleId)
    if (manualRuleEditingId.value === ruleId) resetManualRuleDraft()
    toast.success(t('common.saved'))
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'errors.common.unknown')))
  }
}

function manualRuleCategoryLabel(rule: RecurringManualRuleDto): string {
  const cat = expenseCategoriesForRecurring.value.find((c) => c.id === rule.categoryId)
  const sub = cat?.subcategories?.find((s) => s.id === rule.subcategoryId)
  if (!cat) return '—'
  if (sub) return `${cat.icon} ${cat.name} · ${sub.name}`
  return `${cat.icon} ${cat.name}`
}

function manualRuleAmountRangeLabel(rule: RecurringManualRuleDto): string {
  if (rule.minAmount != null && rule.maxAmount != null) return `${formatEuro(rule.minAmount, false)} - ${formatEuro(rule.maxAmount, false)}`
  if (rule.minAmount != null) return `>= ${formatEuro(rule.minAmount, false)}`
  if (rule.maxAmount != null) return `<= ${formatEuro(rule.maxAmount, false)}`
  return '—'
}

function syncRecurringProfileFromUser(): void {
  recurringExcludedCategoryIds.value = Array.isArray(store.user?.recurringExcludedCategoryIds)
    ? [...store.user!.recurringExcludedCategoryIds]
    : []
  recurringSavingsCategoryIds.value = Array.isArray(store.user?.recurringSavingsCategoryIds)
    ? [...store.user!.recurringSavingsCategoryIds]
    : []
}

async function onToggleRecurringExcludeCategory(categoryId: string, checked: boolean): Promise<void> {
  const next = new Set(recurringExcludedCategoryIds.value)
  if (checked) next.add(categoryId)
  else next.delete(categoryId)
  recurringExcludedCategoryIds.value = [...next]
  recurringSaving.value = true
  try {
    store.user = await api.updateProfile({ recurringExcludedCategoryIds: recurringExcludedCategoryIds.value })
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    syncRecurringProfileFromUser()
    toast.error(t(resolveApiErrorI18nKey(e, 'stats.saveExclusionError')))
  } finally {
    recurringSaving.value = false
  }
}

async function onToggleRecurringSavingsCategory(categoryId: string, checked: boolean): Promise<void> {
  const next = new Set(recurringSavingsCategoryIds.value)
  if (checked) next.add(categoryId)
  else next.delete(categoryId)
  recurringSavingsCategoryIds.value = [...next]
  recurringSaving.value = true
  try {
    store.user = await api.updateProfile({ recurringSavingsCategoryIds: recurringSavingsCategoryIds.value })
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    syncRecurringProfileFromUser()
    toast.error(t(resolveApiErrorI18nKey(e, 'stats.saveRecurringSavingsError')))
  } finally {
    recurringSaving.value = false
  }
}

async function toggleRecurringPatternSavings(row: StatsRecurringExpenseDto): Promise<void> {
  if (!row.patternKey) return
  recurringSavingPatternKey.value = row.patternKey
  try {
    await api.setRecurringPatternSavings(row.patternKey, !row.isSavings)
    const nextKeys = new Set(Array.isArray(store.user?.recurringSavingsPatternKeys) ? store.user!.recurringSavingsPatternKeys : [])
    if (!row.isSavings) nextKeys.add(row.patternKey)
    else nextKeys.delete(row.patternKey)
    store.user = await api.updateProfile({ recurringSavingsPatternKeys: [...nextKeys] })
    await loadRecurringOverview()
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'stats.saveRecurringSavingsError')))
  } finally {
    recurringSavingPatternKey.value = null
  }
}

async function dismissRecurringPattern(row: StatsRecurringExpenseDto): Promise<void> {
  if (!row.patternKey) return
  recurringSaving.value = true
  try {
    await api.dismissRecurringPattern(row.patternKey)
    await loadRecurringOverview()
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'stats.couldNotApply')))
  } finally {
    recurringSaving.value = false
  }
}

function openRecategorizeRecurring(row: StatsRecurringExpenseDto): void {
  recategorizeModalRow.value = row
  recategorizeCategoryId.value = row.categoryId ?? ''
  recategorizeSubcategoryId.value = row.subcategoryId ?? ''
}

async function confirmRecategorizeRecurring(): Promise<void> {
  const row = recategorizeModalRow.value
  if (!row?.patternKey) return
  recategorizeBusy.value = true
  try {
    await api.setRecurringPatternCategory(
      row.patternKey,
      recategorizeCategoryId.value || null,
      recategorizeSubcategoryId.value || null
    )
    recategorizeModalRow.value = null
    await loadRecurringOverview()
    toast.success(t('stats.saved'))
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'stats.couldNotApply')))
  } finally {
    recategorizeBusy.value = false
  }
}

function onToggleCategoryIncluded(categoryId: string, included: boolean): void {
  const next = new Set(excludedCategoryIds.value)
  if (included) next.delete(categoryId)
  else next.add(categoryId)
  excludedCategoryIds.value = next
}

function onToggleSubcategoryIncluded(subcategoryId: string, included: boolean): void {
  const next = new Set(excludedSubcategoryIds.value)
  if (included) next.delete(subcategoryId)
  else next.add(subcategoryId)
  excludedSubcategoryIds.value = next
}

watch(
  () => paceModeDraft.value,
  (mode, prevMode) => {
    if (suppressAutoPaceSave.value) return
    if (mode === prevMode) return
    if (mode === 'custom') return
    if (paceSaving.value) return
    if ((store.user?.budgetPaceMode ?? 'flexible') === mode) return
    void savePaceConfig()
  }
)

watch(
  () => [budgetMonth.value, store.user?.id],
  () => {
    void reloadBudgets()
    void loadBudgetPace()
    void loadRecurringOverview()
    void loadRecurringManualRules()
    plannedDueMonth.value = budgetMonth.value
    if (recommendations.value) void loadRecommendations()
  },
  { immediate: true }
)

watch(
  () => activeBudgetTab.value,
  (tab) => {
    if (tab === 'planned') void loadPlannedCommitments()
  },
)

watch(
  () => store.user,
  () => {
    syncRecurringProfileFromUser()
  },
  { immediate: true, deep: true }
)

watch(recategorizeCategoryId, (id) => {
  if (!id) {
    recategorizeSubcategoryId.value = ''
    return
  }
  const exists = recategorizeSubcategoryOptions.value.some(s => s.id === recategorizeSubcategoryId.value)
  if (!exists) recategorizeSubcategoryId.value = ''
})

watch(
  () => manualRuleDraft.value.categoryId,
  () => {
    if (!manualRuleDraft.value.subcategoryId) return
    const exists = manualRuleSubcategories.value.some((s) => s.id === manualRuleDraft.value.subcategoryId)
    if (!exists) manualRuleDraft.value.subcategoryId = ''
  }
)

watch(
  () => recoProfile.value,
  (profile) => {
    recoTargetSavingsPct.value = PROFILE_DEFAULT_TARGET_PCT[profile]
  },
  { immediate: true }
)

watch(
  () => expenseCategories.value,
  (cats) => {
    const catDraft = { ...categoryBudgetDraft.value }
    const subDraft = { ...subcategoryBudgetDraft.value }
    for (const cat of cats) {
      const id = cat.id!
      if (!Object.prototype.hasOwnProperty.call(catDraft, id)) catDraft[id] = 0
      if (!subDraft[id]) subDraft[id] = {}
      for (const sub of cat.subcategories ?? []) {
        if (!Object.prototype.hasOwnProperty.call(subDraft[id], sub.id)) subDraft[id][sub.id] = 0
      }
    }
    categoryBudgetDraft.value = catDraft
    subcategoryBudgetDraft.value = subDraft
  },
  { immediate: true, deep: true }
)
</script>
