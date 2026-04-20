<template>
  <div class="mx-auto flex w-full max-w-screen-xl min-h-0 flex-1 flex-col gap-3 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
    <div class="flex flex-shrink-0 flex-wrap items-end justify-between gap-2">
      <p class="text-xs dark:text-dark-txt2 text-light-txt2 md:hidden">
        {{ t('movements.scrollHint') }}
      </p>
      <div v-if="!initialLoading" class="ml-auto flex items-end gap-3 md:ml-0">
        <div class="min-w-[180px]">
          <label class="mb-1 block text-xs font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('movements.status') }}</label>
          <select v-model="filters.excludeState" :class="filterInputClass">
            <option value="">{{ t('movements.all') }}</option>
            <option value="false">{{ t('movements.active') }}</option>
            <option value="true">{{ t('movements.excludedPlural') }}</option>
          </select>
        </div>
        <button
          type="button"
          class="mb-1 text-xs font-semibold text-brand-blue hover:underline"
          @click="resetFiltersAndSort"
        >
          {{ t('movements.clearFiltersSort') }}
        </button>
      </div>
    </div>

    <!--
      El scroll va en un hijo sin padding superior: si el scroll es el propio .mw-card (p-5),
      las filas pueden dibujarse en la franja de padding por encima del thead sticky.
    -->
    <div class="mw-card flex min-h-0 flex-1 flex-col overflow-hidden !p-0">
      <div
        ref="scrollEl"
        class="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-5 pb-5 pt-0"
        @scroll.passive="onScroll"
      >
        <div v-if="initialLoading" class="py-12 text-center text-sm dark:text-dark-txt2 text-light-txt2">
          {{ t('movements.loadingMovements') }}
        </div>
        <div
          v-else
          class="relative"
          :class="{ 'pointer-events-none opacity-55': filtersBusy }"
        >
          <table class="isolate w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                <th :class="[thSticky, 'min-w-[140px] max-w-[200px] align-top text-left']">
                  <button
                    type="button"
                    class="mb-1 flex w-full items-center gap-1 text-left text-xs font-semibold hover:text-brand-blue"
                    @click="setSort('date')"
                  >
                    {{ t('movements.date') }} <span class="font-mono text-[10px] opacity-70">{{ sortGlyph('date') }}</span>
                  </button>
                  <MwDateRangePicker v-model="dateRangeFilter" />
                </th>
                <th :class="[thSticky, 'min-w-[140px] align-top text-left']">
                  <button
                    type="button"
                    class="mb-1 flex w-full items-center gap-1 text-left text-xs font-semibold hover:text-brand-blue"
                    @click="setSort('description')"
                  >
                    {{ t('movements.description') }} <span class="font-mono text-[10px] opacity-70">{{ sortGlyph('description') }}</span>
                  </button>
                  <input
                    v-model="filters.description"
                    type="search"
                    :placeholder="t('movements.contains')"
                    :class="filterInputClass"
                  />
                </th>
                <th :class="[thSticky, 'hidden min-w-[120px] align-top text-left sm:table-cell']">
                  <button
                    type="button"
                    class="mb-1 flex w-full items-center gap-1 text-left text-xs font-semibold hover:text-brand-blue"
                    @click="setSort('category')"
                  >
                    {{ t('movements.category') }} <span class="font-mono text-[10px] opacity-70">{{ sortGlyph('category') }}</span>
                  </button>
                  <select v-model="filters.categoryId" :class="filterInputClass">
                    <option value="">{{ t('movements.allFemale') }}</option>
                    <option v-for="c in allCategories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
                  </select>
                </th>
                <th :class="[thSticky, 'hidden min-w-[100px] align-top text-left md:table-cell']">
                  <button
                    type="button"
                    class="mb-1 flex w-full items-center gap-1 text-left text-xs font-semibold hover:text-brand-blue"
                    @click="setSort('type')"
                  >
                    {{ t('movements.type') }} <span class="font-mono text-[10px] opacity-70">{{ sortGlyph('type') }}</span>
                  </button>
                  <select v-model="filters.type" :class="filterInputClass">
                    <option value="">{{ t('movements.all') }}</option>
                    <option value="income">{{ t('movements.income') }}</option>
                    <option value="expense">{{ t('movements.expense') }}</option>
                    <option value="transfer">{{ t('movements.transfer') }}</option>
                  </select>
                </th>
                <th :class="[thSticky, 'hidden min-w-[108px] align-top text-left lg:table-cell']">
                  <button
                    type="button"
                    class="mb-1 flex w-full items-center gap-1 text-left text-xs font-semibold hover:text-brand-blue"
                    @click="setSort('importSource')"
                  >
                    {{ t('movements.source') }} <span class="font-mono text-[10px] opacity-70">{{ sortGlyph('importSource') }}</span>
                  </button>
                  <select v-model="filters.importSource" :class="filterInputClass">
                    <option value="">{{ t('movements.all') }}</option>
                    <option value="manual">{{ t('movements.manual') }}</option>
                    <option value="csv">{{ t('movements.importExcel') }}</option>
                    <option value="bank_api">{{ t('movements.bank') }}</option>
                  </select>
                </th>
                <th :class="[thSticky, 'min-w-[100px] align-top text-right']">
                  <button
                    type="button"
                    class="mb-1 flex w-full items-center justify-end gap-1 text-xs font-semibold hover:text-brand-blue"
                    @click="setSort('amount')"
                  >
                    {{ t('movements.amount') }} <span class="font-mono text-[10px] opacity-70">{{ sortGlyph('amount') }}</span>
                  </button>
                  <MwAmountRangePicker v-model="amountRangeFilter" />
                </th>
                <th :class="[thSticky, 'min-w-[6.75rem] align-top text-center text-xs font-semibold']">
                  {{ t('movements.action') }}
                  <p class="mt-6 text-[10px] font-normal opacity-60">—</p>
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-if="!rows.length">
                <tr>
                  <td colspan="7" class="py-10 text-center text-sm dark:text-dark-txt2 text-light-txt2">
                    {{ t('movements.noMovementsForCriteria') }}
                  </td>
                </tr>
              </template>
              <template v-else>
                <tr
                  v-for="tx in rows"
                  :key="tx.id"
                  :class="[
                    'relative z-0 border-b border-brand-blue/5 dark:border-white/[0.05] hover:bg-brand-blue/[0.04] dark:hover:bg-white/[0.03]',
                    tx.isExcluded ? 'opacity-55' : '',
                  ]"
                >
                  <td class="py-2.5 px-2 whitespace-nowrap dark:text-dark-txt2 text-light-txt2">{{ formatDate(tx.date) }}</td>
                  <td class="py-2.5 px-2 dark:text-dark-txt text-light-txt">
                    <div class="flex items-start gap-2">
                      <span class="line-clamp-2">{{ tx.description }}</span>
                      <span
                        v-if="tx.isExcluded"
                        class="shrink-0 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500"
                        :title="t('movements.excludedHint')"
                      >
                        {{ t('movements.excluded') }}
                      </span>
                    </div>
                  </td>
                  <td class="py-2.5 px-2 hidden sm:table-cell dark:text-dark-txt2 text-light-txt2 text-xs">
                    {{ categoryLabel(tx) }}
                  </td>
                  <td class="py-2.5 px-2 hidden md:table-cell text-xs">{{ typeLabel(tx.type) }}</td>
                  <td class="py-2.5 px-2 hidden lg:table-cell text-xs">{{ sourceLabel(tx.importSource) }}</td>
                  <td
                    :class="[
                      'py-2.5 px-2 text-right font-semibold whitespace-nowrap',
                      tx.type === 'income' && 'text-emerald-500',
                      tx.type === 'expense' && 'text-red-400',
                      tx.type === 'transfer' && 'dark:text-dark-txt text-light-txt',
                    ]"
                  >
                    {{ amountCell(tx) }}
                  </td>
                  <td class="py-2.5 px-2 text-center">
                    <div class="inline-flex flex-wrap items-center justify-center gap-1.5">
                      <button
                        v-if="tx.importSource === 'manual'"
                        type="button"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-blue/20 text-sm text-brand-blue transition-colors hover:bg-brand-blue/10 disabled:opacity-50 dark:border-brand-blue/35"
                        :title="t('movements.edit')"
                        :aria-label="t('movements.edit')"
                        :disabled="Boolean(excludingTx[String(tx.id)])"
                        @click="openEdit(tx)"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-lg border text-sm transition-colors disabled:opacity-50"
                        :class="
                          tx.isExcluded
                            ? 'border-amber-500/40 text-amber-500 hover:bg-amber-500/10'
                            : 'border-red-400/35 text-red-400 hover:bg-red-500/10'
                        "
                        :title="tx.isExcluded ? t('movements.restore') : t('movements.exclude')"
                        :aria-label="tx.isExcluded ? t('movements.restore') : t('movements.exclude')"
                        :disabled="Boolean(excludingTx[String(tx.id)])"
                        @click="openExcludeConfirm(tx)"
                      >
                        {{ tx.isExcluded ? '↩' : '⛔' }}
                      </button>
                      <button
                        v-if="canAddAsRecurring(tx)"
                        type="button"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-blue/20 text-sm text-brand-blue transition-colors hover:bg-brand-blue/10 disabled:opacity-50 dark:border-brand-blue/35"
                        :title="t('movements.addRecurringTooltip')"
                        :aria-label="t('movements.addRecurringTooltip')"
                        :disabled="Boolean(recurringSaving[String(tx.id)])"
                        @click="addMovementAsRecurring(tx)"
                      >
                        🔁
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot v-if="rows.length">
              <tr
                class="border-t-2 border-brand-blue/20 bg-light-card font-semibold dark:border-white/[0.12] dark:bg-dark-card dark:text-dark-txt text-light-txt"
              >
                <td class="py-2.5 px-2 align-top whitespace-nowrap text-xs">{{ t('movements.totals') }}</td>
                <td class="py-2.5 px-2 align-top text-[10px] font-normal leading-snug dark:text-dark-txt2 text-light-txt2">
                  {{ rows.length }} {{ rows.length === 1 ? t('movements.loadedRow') : t('movements.loadedRows')
                  }}<span v-if="hasMore"> · {{ t('movements.scrollToLoadMore') }}</span>
                </td>
                <td class="hidden py-2.5 px-2 sm:table-cell"></td>
                <td class="hidden py-2.5 px-2 md:table-cell"></td>
                <td class="hidden py-2.5 px-2 lg:table-cell"></td>
                <td class="py-2.5 px-2 text-right align-top text-xs tabular-nums">
                  <div v-if="totals.income > 0" class="text-emerald-500">+€{{ fmtEur(totals.income) }}</div>
                  <div v-if="totals.expense > 0" class="text-red-400">−€{{ fmtEur(totals.expense) }}</div>
                  <div v-if="totals.transfer > 0" class="font-medium dark:text-dark-txt2 text-light-txt2">
                    {{ t('movements.transfers') }} €{{ fmtEur(totals.transfer) }}
                  </div>
                  <div
                    v-if="totals.income > 0 || totals.expense > 0"
                    class="mt-1 border-t border-brand-blue/10 pt-1 text-[11px] dark:border-white/[0.08]"
                    :class="totals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'"
                  >
                    {{ t('movements.balanceIncomeExpense') }} {{ totals.net >= 0 ? '+' : '−' }}€{{ fmtEur(Math.abs(totals.net)) }}
                  </div>
                </td>
                <td class="py-2.5 px-2"></td>
              </tr>
            </tfoot>
          </table>

          <div v-if="loadingMore" class="py-3 text-center text-xs dark:text-dark-txt2 text-light-txt2">
            {{ t('movements.loadingMore') }}
          </div>
          <div
            v-else-if="rows.length && !hasMore"
            class="py-3 text-center text-[10px] dark:text-dark-txt3 text-light-txt3"
          >
            {{ t('movements.endOfList') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmación excluir/restaurar -->
    <Teleport to="body">
      <div
        v-if="excludeConfirm"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        @click.self="closeExcludeConfirm"
      >
        <div
          class="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl mw-card border dark:border-white/[0.07] border-brand-blue/10 shadow-xl"
          @click.stop
        >
          <AlertCard
            :alert="excludeConfirmAlert"
            @dismiss="closeExcludeConfirm"
            @action="confirmExcludeToggle"
          />
        </div>
      </div>
    </Teleport>

    <!-- Modal edición (solo manual) -->
    <Teleport to="body">
      <div
        v-if="editing"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        @click.self="closeEdit"
      >
        <div
          class="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl mw-card border dark:border-white/[0.07] border-brand-blue/10 shadow-xl"
          @click.stop
        >
          <div class="flex items-center justify-between gap-2 mb-4">
            <p class="font-display font-bold text-base dark:text-dark-txt text-light-txt">{{ t('movements.editMovement') }}</p>
            <button type="button" class="text-sm dark:text-dark-txt2 text-light-txt2 hover:text-brand-blue" @click="closeEdit">
              {{ t('common.close') }}
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs uppercase tracking-wider mb-1 font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('movements.type') }}</label>
              <select v-model="editForm.type" class="mw-input w-full">
                <option value="expense">{{ t('movements.expense') }}</option>
                <option value="income">{{ t('movements.income') }}</option>
                <option value="transfer">{{ t('movements.transfer') }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs uppercase tracking-wider mb-1 font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('movements.date') }}</label>
              <input v-model="editForm.date" type="date" class="mw-input w-full" />
            </div>
            <div>
              <label class="block text-xs uppercase tracking-wider mb-1 font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('movements.amount') }}</label>
              <input v-model="editForm.amount" type="number" step="0.01" min="0.01" class="mw-input w-full" />
            </div>
            <div class="sm:col-span-2" v-if="editForm.type === 'expense'">
              <label class="block text-xs uppercase tracking-wider mb-1 font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('movements.category') }}</label>
              <select v-model="editForm.categoryId" class="mw-input w-full">
                <option value="" disabled>{{ t('movements.selectCategory') }}</option>
                <option v-for="c in expenseCategories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
              </select>
            </div>
            <div class="sm:col-span-2" v-if="editForm.type === 'income'">
              <label class="block text-xs uppercase tracking-wider mb-1 font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('movements.category') }}</label>
              <select v-model="editForm.categoryId" class="mw-input w-full">
                <option value="">{{ t('movements.noCategory') }}</option>
                <option v-for="c in incomeCategories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
              </select>
            </div>
            <p v-if="editForm.type === 'transfer'" class="sm:col-span-2 text-xs dark:text-dark-txt2 text-light-txt2">
              {{ t('movements.transferNoCategoryHint') }}
            </p>
            <div class="sm:col-span-2" v-if="editForm.type === 'expense' && subcategoryOptions.length">
              <label class="block text-xs uppercase tracking-wider mb-1 font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('movements.subcategory') }}</label>
              <select v-model="editForm.subcategoryId" class="mw-input w-full">
                <option value="">{{ t('movements.selectSubcategory') }}</option>
                <option v-for="s in subcategoryOptions" :key="s.id" :value="s.id">{{ s.icon }} {{ s.name }}</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs uppercase tracking-wider mb-1 font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('movements.description') }}</label>
              <input v-model="editForm.description" maxlength="200" class="mw-input w-full" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs uppercase tracking-wider mb-1 font-semibold dark:text-dark-txt2 text-light-txt2">{{ t('movements.comment') }}</label>
              <input v-model="editForm.notes" maxlength="1000" class="mw-input w-full" :placeholder="t('movements.optional')" />
            </div>
          </div>

          <p v-if="editError" class="mt-3 text-xs text-red-500">{{ editError }}</p>

          <div class="flex gap-2 mt-5">
            <button type="button" class="flex-1 py-3 rounded-xl text-sm font-semibold border dark:border-white/[0.07] dark:text-dark-txt2" @click="closeEdit">
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="flex-1 btn-primary !py-3 !text-sm"
              :disabled="!editValid || savingEdit"
              :class="{ 'opacity-40 cursor-not-allowed': !editValid || savingEdit }"
              @click="saveEdit"
            >
              {{ savingEdit ? t('movements.saving') : t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWalletStore, type Category, type Alert } from '@/stores/wallet'
import { api, type ApiTransaction } from '@/services/api'
import MwDateRangePicker from '@/components/MwDateRangePicker.vue'
import MwAmountRangePicker from '@/components/MwAmountRangePicker.vue'
import AlertCard from '@/components/AlertCard.vue'
import { resolveApiErrorI18nKey } from '@/utils/apiErrorMap'
import { useToast } from '@/composables/useToast'

type SortColumn = 'date' | 'amount' | 'description' | 'type' | 'importSource' | 'category'

const store = useWalletStore()
const { t, locale } = useI18n()
const toast = useToast()

/** Fondo opaco alineado con `.mw-card` y sticky por `<th>` (el encabezado queda por encima del scroll del cuerpo). */
const thSticky =
  'sticky top-0 z-40 border-b border-brand-blue/10 bg-light-card py-3 px-2 align-top font-semibold text-light-txt dark:border-white/[0.07] dark:bg-dark-card dark:text-dark-txt'

const filterInputClass =
  'w-full min-w-0 rounded-lg border border-brand-blue/15 bg-light-surf px-1.5 py-1 text-xs text-light-txt dark:border-white/[0.07] dark:bg-dark-surf dark:text-dark-txt'

const filters = reactive({
  dateFrom: '',
  dateTo: '',
  description: '',
  categoryId: '',
  type: '' as '' | 'income' | 'expense' | 'transfer',
  importSource: '' as '' | 'manual' | 'csv' | 'bank_api',
  excludeState: '' as '' | 'true' | 'false',
  minAmount: '',
  maxAmount: '',
})

const dateRangeFilter = computed({
  get: () => ({ from: filters.dateFrom, to: filters.dateTo }),
  set(v: { from: string; to: string }) {
    filters.dateFrom = v.from
    filters.dateTo = v.to
  },
})

const amountRangeFilter = computed({
  get: () => ({ min: filters.minAmount, max: filters.maxAmount }),
  set(v: { min: string; max: string }) {
    filters.minAmount = v.min
    filters.maxAmount = v.max
  },
})

const sortBy = ref<SortColumn>('date')
const sortOrder = ref<'asc' | 'desc'>('desc')

const scrollEl = ref<HTMLElement | null>(null)
const rows = ref<ApiTransaction[]>([])
const page = ref(1)
const hasMore = ref(true)
const initialLoading = ref(true)
const loadingMore = ref(false)
const filtersBusy = ref(false)
const PAGE_SIZE = 20

let filterDebounceTimer: ReturnType<typeof setTimeout> | undefined
/** Evita un segundo GET al resetear: el `watch` profundo también reacciona a los cambios. */
const filterWatchPaused = ref(false)

const editing = ref<ApiTransaction | null>(null)
const editError = ref('')
const savingEdit = ref(false)
const excludingTx = ref<Record<string, boolean>>({})
const recurringSaving = ref<Record<string, boolean>>({})
const excludeConfirm = ref<{ tx: ApiTransaction; toExcluded: boolean } | null>(null)

const editForm = ref({
  type: 'expense' as ApiTransaction['type'],
  date: '',
  amount: '',
  categoryId: '',
  subcategoryId: '',
  description: '',
  notes: '',
})

const expenseCategories = computed<Category[]>(() =>
  store.categories.filter(c => c.categoryType !== 'income' && c.id)
)
const incomeCategories = computed<Category[]>(() =>
  store.categories.filter(c => c.categoryType === 'income' && c.id)
)

const allCategories = computed(() => store.categories.filter(c => Boolean(c.id)))

const totals = computed(() => {
  let income = 0
  let expense = 0
  let transfer = 0
  for (const tx of rows.value) {
    if (tx.isExcluded) continue
    const a = Math.abs(Number(tx.amount))
    if (!Number.isFinite(a)) continue
    if (tx.type === 'income') income += a
    else if (tx.type === 'expense') expense += a
    else transfer += a
  }
  return { income, expense, transfer, net: income - expense }
})

function fmtEur(n: number): string {
  const numberLocale = locale.value === 'en' ? 'en-US' : locale.value === 'de' ? 'de-DE' : 'es-ES'
  return n.toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const selectedEditCategory = computed(() =>
  store.categories.find(c => c.id === editForm.value.categoryId)
)

const subcategoryOptions = computed(() => selectedEditCategory.value?.subcategories ?? [])

const subcategoryRequired = computed(
  () => editForm.value.type === 'expense' && subcategoryOptions.value.length > 0
)

const editValid = computed(() => {
  const amt = parseFloat(editForm.value.amount)
  if (!editForm.value.description.trim() || !editForm.value.date || !Number.isFinite(amt) || amt <= 0) return false
  if (editForm.value.type === 'expense' && !editForm.value.categoryId) return false
  if (editForm.value.type === 'expense' && subcategoryRequired.value && !editForm.value.subcategoryId) return false
  return true
})

watch(
  () => editForm.value.categoryId,
  () => {
    editForm.value.subcategoryId = ''
  }
)

watch(
  () => editForm.value.type,
  (t) => {
    if (t === 'income') {
      editForm.value.categoryId = editForm.value.categoryId || ''
    }
  }
)

function formatDate(iso: string): string {
  try {
    const dateLocale = locale.value === 'en' ? 'en-US' : locale.value === 'de' ? 'de-DE' : 'es-ES'
    return new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function categoryLabel(tx: ApiTransaction): string {
  if (tx.subcategory?.name && tx.category?.name) return `${tx.category.name} › ${tx.subcategory.name}`
  return tx.category?.name ?? '—'
}

function typeLabel(kind: ApiTransaction['type']): string {
  if (kind === 'income') return t('movements.income')
  if (kind === 'transfer') return t('movements.transfer')
  return t('movements.expense')
}

function sourceLabel(s: ApiTransaction['importSource'] | undefined): string {
  if (s === 'csv') return t('movements.importExcel')
  if (s === 'bank_api') return t('movements.bank')
  return t('movements.manual')
}

function amountCell(tx: ApiTransaction): string {
  const numberLocale = locale.value === 'en' ? 'en-US' : locale.value === 'de' ? 'de-DE' : 'es-ES'
  const abs = Math.abs(tx.amount).toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (tx.type === 'income') return `+€${abs}`
  if (tx.type === 'expense') return `-€${abs}`
  return `€${abs}`
}

/** Día del mes desde `YYYY-MM-DD` sin depender de la zona horaria del `Date`. */
function dayOfMonthFromTxDate(iso: string): number {
  const ymd = String(iso).slice(0, 10)
  const br = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (br) return parseInt(br[3]!, 10)
  try {
    return new Date(iso).getUTCDate()
  } catch {
    return 1
  }
}

function canAddAsRecurring(tx: ApiTransaction): boolean {
  if (tx.type === 'income') return false
  return Boolean(tx.category?.id)
}

async function addMovementAsRecurring(tx: ApiTransaction): Promise<void> {
  const key = String(tx.id)
  if (!canAddAsRecurring(tx)) {
    toast.error(t('movements.addRecurringNeedCategory'))
    return
  }
  const conceptPattern = String(tx.description ?? '').trim()
  if (!conceptPattern) {
    toast.error(t('movements.addRecurringNeedDescription'))
    return
  }
  const dom = dayOfMonthFromTxDate(tx.date)
  const fromDay = Math.max(1, dom - 1)
  const toDay = Math.min(31, dom + 1)
  const rawAbs = Math.abs(Number(tx.amount))
  const absAmt = Math.round((rawAbs + Number.EPSILON) * 100) / 100
  if (!Number.isFinite(absAmt) || absAmt <= 0) return

  recurringSaving.value = { ...recurringSaving.value, [key]: true }
  try {
    await api.createRecurringManualRule({
      conceptPattern,
      fromDay,
      toDay,
      minAmount: absAmt,
      maxAmount: absAmt,
      categoryId: tx.category!.id,
      subcategoryId: tx.subcategory?.id ?? null,
    })
    await store.loadUser()
    toast.success(t('movements.addRecurringSuccess'))
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'movements.couldNotSave')))
  } finally {
    const cp = { ...recurringSaving.value }
    delete cp[key]
    recurringSaving.value = cp
  }
}

function buildListParams(pageNum: number): NonNullable<Parameters<typeof api.getTransactions>[0]> {
  const p: NonNullable<Parameters<typeof api.getTransactions>[0]> = {
    page: pageNum,
    limit: PAGE_SIZE,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
  }
  if (filters.dateFrom.trim()) p.from = filters.dateFrom.trim()
  if (filters.dateTo.trim()) p.to = filters.dateTo.trim()
  if (filters.description.trim()) p.description = filters.description.trim()
  if (filters.categoryId) p.categoryId = filters.categoryId
  if (filters.type) p.type = filters.type
  if (filters.importSource) p.importSource = filters.importSource
  if (filters.excludeState !== '') p.isExcluded = filters.excludeState === 'true'
  const min = parseFloat(filters.minAmount)
  if (filters.minAmount.trim() !== '' && Number.isFinite(min)) p.minAmount = min
  const max = parseFloat(filters.maxAmount)
  if (filters.maxAmount.trim() !== '' && Number.isFinite(max)) p.maxAmount = max
  return p
}

function sortGlyph(col: SortColumn): string {
  if (sortBy.value !== col) return '·'
  return sortOrder.value === 'asc' ? '▲' : '▼'
}

function setSort(col: SortColumn): void {
  if (sortBy.value === col) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = col
    sortOrder.value =
      col === 'description' || col === 'category' || col === 'type' || col === 'importSource' ? 'asc' : 'desc'
  }
  void reloadFromFilters()
}

async function reloadFromFilters(): Promise<void> {
  if (initialLoading.value) return
  filtersBusy.value = true
  page.value = 1
  try {
    const { data, meta } = await api.getTransactions(buildListParams(1))
    rows.value = data
    hasMore.value = Boolean(meta.hasNext)
    if (scrollEl.value) scrollEl.value.scrollTop = 0
  } catch (e) {
    console.error(e)
    rows.value = []
    hasMore.value = false
  } finally {
    filtersBusy.value = false
  }
}

function resetFiltersAndSort(): void {
  clearTimeout(filterDebounceTimer)
  filterWatchPaused.value = true
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.description = ''
  filters.categoryId = ''
  filters.type = ''
  filters.importSource = ''
  filters.excludeState = ''
  filters.minAmount = ''
  filters.maxAmount = ''
  sortBy.value = 'date'
  sortOrder.value = 'desc'
  void reloadFromFilters().finally(() => {
    filterWatchPaused.value = false
  })
}

watch(
  filters,
  () => {
    if (filterWatchPaused.value) return
    clearTimeout(filterDebounceTimer)
    filterDebounceTimer = setTimeout(() => {
      void reloadFromFilters()
    }, 350)
  },
  { deep: true }
)

async function loadInitial(): Promise<void> {
  initialLoading.value = true
  page.value = 1
  hasMore.value = true
  try {
    const { data, meta } = await api.getTransactions(buildListParams(1))
    rows.value = data
    hasMore.value = Boolean(meta.hasNext)
  } catch (e) {
    console.error(e)
    rows.value = []
    hasMore.value = false
  } finally {
    initialLoading.value = false
  }
}

async function loadNext(): Promise<void> {
  if (!hasMore.value || loadingMore.value || initialLoading.value || filtersBusy.value) return
  loadingMore.value = true
  try {
    const next = page.value + 1
    const { data, meta } = await api.getTransactions(buildListParams(next))
    rows.value = rows.value.concat(data)
    page.value = next
    hasMore.value = Boolean(meta.hasNext)
  } catch (e) {
    console.error(e)
  } finally {
    loadingMore.value = false
  }
}

function onScroll(e: Event): void {
  const el = e.target as HTMLElement
  if (!hasMore.value || loadingMore.value || initialLoading.value || filtersBusy.value) return
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
  if (nearBottom) void loadNext()
}

function openEdit(tx: ApiTransaction): void {
  editing.value = tx
  editError.value = ''
  editForm.value = {
    type: tx.type,
    date: String(tx.date).slice(0, 10),
    amount: String(tx.amount),
    categoryId: tx.category?.id ?? '',
    subcategoryId: tx.subcategory?.id ?? '',
    description: tx.description,
    notes: tx.notes ?? '',
  }
}

function closeEdit(): void {
  editing.value = null
  editError.value = ''
}

async function saveEdit(): Promise<void> {
  if (!editing.value || !editValid.value) return
  savingEdit.value = true
  editError.value = ''
  try {
    const payload: Parameters<typeof api.updateTransaction>[1] = {
      description: editForm.value.description.trim(),
      date: editForm.value.date,
      amount: parseFloat(editForm.value.amount),
      type: editForm.value.type,
      notes: editForm.value.notes.trim() || null,
    }
    if (editForm.value.type === 'expense') {
      payload.categoryId = editForm.value.categoryId
      payload.subcategoryId = editForm.value.subcategoryId.trim() ? editForm.value.subcategoryId : null
    } else if (editForm.value.type === 'income') {
      payload.categoryId = editForm.value.categoryId.trim() ? editForm.value.categoryId : null
      payload.subcategoryId = null
    } else {
      payload.categoryId = null
      payload.subcategoryId = null
    }
    const updated = await api.updateTransaction(editing.value.id, payload)
    const i = rows.value.findIndex(r => r.id === updated.id)
    if (i >= 0) rows.value[i] = updated
    await Promise.all([store.loadDashboard(), store.loadTransactions()])
    closeEdit()
    toast.success(t('common.saved'))
  } catch (err) {
    editError.value = t(resolveApiErrorI18nKey(err, 'movements.couldNotSave'))
    toast.error(editError.value)
  } finally {
    savingEdit.value = false
  }
}

async function toggleExcluded(tx: ApiTransaction): Promise<void> {
  const key = String(tx.id)
  if (excludingTx.value[key]) return
  excludingTx.value = { ...excludingTx.value, [key]: true }
  try {
    const updated = await api.setTransactionExcluded(tx.id, !Boolean(tx.isExcluded))
    const i = rows.value.findIndex(r => r.id === updated.id)
    if (i >= 0) rows.value[i] = updated
    await Promise.all([store.loadDashboard(), store.loadBudgets(), store.loadAlerts()])
    toast.success(t('common.saved'))
  } catch (e) {
    console.error(e)
    toast.error(t('movements.couldNotSave'))
  } finally {
    const cp = { ...excludingTx.value }
    delete cp[key]
    excludingTx.value = cp
  }
}

const excludeConfirmAlert = computed<Alert>(() => {
  const p = excludeConfirm.value
  if (!p) {
    return {
      id: 'exclude-confirm-empty',
      type: 'info',
      badge: t('movements.confirmation'),
      title: t('movements.confirmAction'),
      body: '',
      amount: null,
      actions: [
        { label: t('movements.confirm'), style: 'primary' },
        { label: t('common.cancel'), style: 'secondary' },
      ],
    }
  }
  const title = p.toExcluded ? t('movements.excludeQuestion') : t('movements.restoreQuestion')
  const body = p.toExcluded
    ? t('movements.excludeBody')
    : t('movements.restoreBody')
  return {
    id: `exclude-confirm-${String(p.tx.id)}`,
    type: p.toExcluded ? 'warning' : 'success',
    badge: t('movements.confirmation'),
    title,
    body,
    amount: null,
    actions: [
      { label: p.toExcluded ? t('movements.yesExclude') : t('movements.yesRestore'), style: p.toExcluded ? 'gold' : 'success' },
      { label: t('common.cancel'), style: 'secondary' },
    ],
  }
})

function openExcludeConfirm(tx: ApiTransaction): void {
  excludeConfirm.value = { tx, toExcluded: !Boolean(tx.isExcluded) }
}

function closeExcludeConfirm(): void {
  excludeConfirm.value = null
}

async function confirmExcludeToggle(): Promise<void> {
  const p = excludeConfirm.value
  if (!p) return
  closeExcludeConfirm()
  await toggleExcluded(p.tx)
}

onMounted(() => {
  void loadInitial()
})
</script>
