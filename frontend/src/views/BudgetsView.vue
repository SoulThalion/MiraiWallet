<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <div class="grid grid-cols-1 gap-4 md:gap-6">
      <div class="mw-card">
        <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">{{ t('budgets.title') }}</p>
        <p class="mt-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('budgets.subtitle', { month: budgetMonth }) }}</p>
      </div>

      <div class="mw-card">
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

        <p v-if="budgetError" class="mt-3 text-xs text-red-400">{{ budgetError }}</p>
        <p v-if="budgetMsg" class="mt-3 text-xs text-brand-green">{{ budgetMsg }}</p>

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

      <div class="mw-card">
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
          </label>
          <label class="sm:col-span-1">
            <span class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recoSavingsTarget') }}</span>
            <input v-model.number="recoTargetSavingsPct" type="number" min="5" max="60" step="1" class="mw-input w-full tabular-nums" />
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

          <details v-for="line in recommendations.lines" :key="`reco-${line.categoryId}`" class="rounded-xl border dark:border-white/[0.08] border-brand-blue/10">
            <summary class="cursor-pointer list-none px-3 py-2">
              <div class="flex items-center gap-2">
                <span>{{ line.icon }}</span>
                <span class="flex-1 min-w-0 truncate text-sm font-semibold">{{ line.name }}</span>
                <span class="text-xs dark:text-dark-txt2 text-light-txt2">{{ formatEuro(line.currentBudget, false) }} → {{ formatEuro(line.suggestedBudget, false) }}</span>
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
                  <span class="flex-1 min-w-0 truncate">{{ sub.icon }} {{ sub.name }} ({{ formatEuro(sub.currentBudget, false) }} → {{ formatEuro(sub.suggestedBudget, false) }})</span>
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/services/api'
import type { BudgetRecommendationProfile, BudgetRecommendationResult } from '@/services/api'
import { resolveApiErrorI18nKey } from '@/utils/apiErrorMap'
import { useCurrency } from '@/composables/useCurrency'
import { fiscalYmForDate, monthCycleConfigFromSession } from '@/utils/monthPeriod'

const store = useWalletStore()
const { t } = useI18n()
const { formatEuro } = useCurrency()

const budgetLoading = ref(false)
const budgetSaving = ref(false)
const budgetMsg = ref('')
const budgetError = ref<string | null>(null)
const recoLoading = ref(false)
const recoApplying = ref(false)
const recoError = ref<string | null>(null)
const recoProfile = ref<BudgetRecommendationProfile>('balanced')
const recoTargetSavingsPct = ref(20)
const recommendations = ref<BudgetRecommendationResult | null>(null)
const budgetTotalDraft = ref(0)
const categoryBudgetDraft = ref<Record<string, number>>({})
const subcategoryBudgetDraft = ref<Record<string, Record<string, number>>>({})
const loadedBudgetMap = ref<Record<string, { amount: number }>>({})
const loadedSubcategoryBudgetMap = ref<Record<string, number>>({})
const excludedCategoryIds = ref<Set<string>>(new Set())
const excludedSubcategoryIds = ref<Set<string>>(new Set())
const loadedExcludedCategoryIds = ref<Set<string>>(new Set())
const loadedExcludedSubcategoryIds = ref<Set<string>>(new Set())

const budgetMonth = computed(() => fiscalYmForDate(new Date(), monthCycleConfigFromSession(store.user)))
const allExpenseCategories = computed(() =>
  store.categories.filter(c => Boolean(c.id) && c.categoryType !== 'income')
)
const expenseCategories = computed(() => allExpenseCategories.value)
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
const hasChanges = computed(() => budgetDirty.value || excludeDirty.value)

function subcategorySum(categoryId: string): number {
  const row = subcategoryBudgetDraft.value[categoryId] ?? {}
  return Object.values(row).reduce((sum, v) => sum + Math.max(0, Number(v || 0)), 0)
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
  budgetMsg.value = ''
  try {
    if (!store.categories.length) await store.loadCategories()
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
  } catch (e: unknown) {
    budgetError.value = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
  } finally {
    budgetLoading.value = false
  }
}

async function saveBudgets(): Promise<void> {
  budgetSaving.value = true
  budgetError.value = null
  budgetMsg.value = ''
  try {
    if (excludeDirty.value) {
      await api.updateProfile({
        budgetExcludedCategoryIds: Array.from(excludedCategoryIds.value),
        budgetExcludedSubcategoryIds: Array.from(excludedSubcategoryIds.value),
      })
      await store.loadUser()
      loadedExcludedCategoryIds.value = new Set(excludedCategoryIds.value)
      loadedExcludedSubcategoryIds.value = new Set(excludedSubcategoryIds.value)
    }

    const targetTotal = Math.max(0, Number(budgetTotalDraft.value || 0))
    distributeToTotal(targetTotal)

    const payloadsCategory: Array<{ categoryId: string; amount: number; month: string }> = []
    const payloadsSubcategory: Array<{ subcategoryId: string; amount: number; month: string }> = []
    for (const cat of allExpenseCategories.value) {
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
        budgetError.value = t('budgets.subOverCategory', { category: cat.name })
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
    budgetMsg.value = t('budgets.saved')
  } catch (e: unknown) {
    budgetError.value = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
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
    budgetMsg.value = t('budgets.saved')
  } catch (e: unknown) {
    recoError.value = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
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
  } catch (e: unknown) {
    recoError.value = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
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
  } catch (e: unknown) {
    recoError.value = t(resolveApiErrorI18nKey(e, 'errors.common.unknown'))
  } finally {
    recoApplying.value = false
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
  () => [budgetMonth.value, store.user?.id],
  () => {
    void reloadBudgets()
    if (recommendations.value) void loadRecommendations()
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
