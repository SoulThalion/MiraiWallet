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
                <span class="text-base">{{ cat.icon }}</span>
                <span class="flex-1 text-sm font-semibold dark:text-dark-txt text-light-txt">{{ cat.name }}</span>
                <input
                  v-model.number="categoryBudgetDraft[cat.id!]"
                  type="number"
                  min="0"
                  step="0.01"
                  class="mw-input w-32 text-right tabular-nums"
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
                <label v-for="sub in cat.subcategories" :key="sub.id" class="flex items-center gap-2">
                  <span class="min-w-0 flex-1 truncate text-xs dark:text-dark-txt2 text-light-txt2">{{ sub.icon }} {{ sub.name }}</span>
                  <input
                    v-model.number="subcategoryBudgetDraft[cat.id!][sub.id]"
                    type="number"
                    min="0"
                    step="0.01"
                    class="mw-input w-28 text-right tabular-nums"
                  />
                </label>
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
            :disabled="budgetSaving || budgetLoading || !budgetDirty"
            @click="saveBudgets"
          >
            {{ budgetSaving ? t('budgets.saving') : t('budgets.save') }}
          </button>
        </div>
      </div>

      <div class="mw-card">
        <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">{{ t('budgets.recommendationsTitle') }}</p>
        <p class="mt-1 text-xs dark:text-dark-txt2 text-light-txt2">{{ t('budgets.recommendationsBody') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/services/api'
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
const budgetTotalDraft = ref(0)
const categoryBudgetDraft = ref<Record<string, number>>({})
const subcategoryBudgetDraft = ref<Record<string, Record<string, number>>>({})
const loadedBudgetMap = ref<Record<string, { amount: number }>>({})
const loadedSubcategoryBudgetMap = ref<Record<string, number>>({})

const budgetMonth = computed(() => fiscalYmForDate(new Date(), monthCycleConfigFromSession(store.user)))
const expenseCategories = computed(() =>
  store.categories.filter(c => Boolean(c.id) && c.categoryType !== 'income')
)
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
    const targetTotal = Math.max(0, Number(budgetTotalDraft.value || 0))
    distributeToTotal(targetTotal)

    const payloadsCategory: Array<{ categoryId: string; amount: number; month: string }> = []
    const payloadsSubcategory: Array<{ subcategoryId: string; amount: number; month: string }> = []
    for (const cat of expenseCategories.value) {
      const categoryId = cat.id!
      const amount = Math.max(0, Number(categoryBudgetDraft.value[categoryId] ?? 0))
      const subRows = subcategoryBudgetDraft.value[categoryId] ?? {}
      const subSum = Object.values(subRows).reduce((sum, v) => sum + Math.max(0, Number(v || 0)), 0)
      if (subSum - amount > 0.009) {
        budgetError.value = t('budgets.subOverCategory', { category: cat.name })
        budgetSaving.value = false
        return
      }
      for (const [subId, val] of Object.entries(subRows)) {
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

watch(
  () => [budgetMonth.value, store.user?.id],
  () => {
    void reloadBudgets()
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
