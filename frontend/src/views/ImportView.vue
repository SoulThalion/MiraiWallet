<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto max-w-2xl">
    <div class="mw-card mb-6">
      <p class="font-display font-extrabold text-lg dark:text-dark-txt text-light-txt">{{ t('import.title') }}</p>
      <p class="text-sm mt-2 dark:text-dark-txt2 text-light-txt2 leading-relaxed">
        {{ t('import.helpIntro') }} <strong class="dark:text-dark-txt text-light-txt">{{ t('import.ingSheetName') }}</strong> {{ t('import.helpFromIng') }}
        {{ t('import.helpColumnsStart') }} <strong>{{ t('import.colValueDate') }}</strong>, <strong>{{ t('import.colDescription') }}</strong> {{ t('import.helpColumnsAnd') }} <strong>{{ t('import.colAmount') }}</strong> {{ t('import.helpColumnsEnd') }}
        {{ t('import.helpValidRowsStart') }} <strong>{{ t('import.helpValidRowsStrong') }}</strong> {{ t('import.helpValidRowsEnd') }}
        {{ t('import.helpSignedStart') }} <strong>{{ t('import.helpExpensesStrong') }}</strong> {{ t('import.helpSignedMiddle') }} <strong>{{ t('import.helpIncomeStrong') }}</strong>.
        {{ t('import.helpBalanceStart') }} <strong>{{ t('import.colBalance') }}</strong>, {{ t('import.helpBalanceMiddle') }} <strong>{{ t('import.helpLastMovementStrong') }}</strong> {{ t('import.helpBalanceEnd') }}
        {{ t('import.helpTransfersStart') }} <strong>{{ t('import.helpTransfersStrong') }}</strong> {{ t('import.helpTransfersMiddle') }} <strong>{{ t('import.helpTransfersNoExpenseStrong') }}</strong> {{ t('import.helpTransfersEnd') }}
      </p>
    </div>

    <div class="mw-card space-y-4">
      <div>
        <label for="import-account" class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">
          {{ t('import.targetAccount') }}
        </label>
        <select
          id="import-account"
          v-model="accountId"
          class="mw-input"
          :disabled="loadingAccounts"
        >
          <option value="" disabled>{{ loadingAccounts ? t('common.loading') : t('import.chooseAccount') }}</option>
          <option v-for="a in accounts" :key="a.id" :value="a.id">
            {{ formatAccountOption(a) }}
          </option>
        </select>
      </div>

      <div>
        <label for="import-file" class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">
          {{ t('import.excelFile') }}
        </label>
        <input
          id="import-file"
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          class="sr-only"
          @change="onFile"
        />
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark"
            @click="fileInput?.click()"
          >
            {{ t('import.selectFile') }}
          </button>
          <p class="text-xs dark:text-dark-txt3 text-light-txt3">
            {{ fileName || t('import.noFileSelected') }}
          </p>
        </div>
      </div>

      <p v-if="errorMsg" class="text-sm text-red-500 dark:text-red-400">{{ errorMsg }}</p>
      <p v-if="successMsg" class="text-sm text-brand-green">{{ successMsg }}</p>

      <div class="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          class="btn-primary !py-3.5 flex-1"
          :disabled="!canSubmit || busy"
          @click="submit"
        >
          {{ busy === 'import' ? t('import.importing') : t('import.importMovements') }}
        </button>
        <button
          type="button"
          class="flex-1 rounded-xl px-4 py-3.5 text-sm font-semibold border transition-colors dark:bg-dark-surf dark:border-white/[0.12] dark:text-dark-txt dark:hover:border-brand-blue/40 bg-light-surf border-brand-blue/15 text-light-txt hover:border-brand-blue/30 disabled:opacity-50"
          :disabled="!canSubmit || busy"
          @click="submitSyncBalanceOnly"
        >
          {{ busy === 'sync' ? t('import.syncing') : t('import.syncOnly') }}
        </button>
      </div>
      <p class="text-xs dark:text-dark-txt2 text-light-txt2 leading-relaxed">
        {{ t('import.syncHelpStart') }} <strong>{{ t('import.colBalance') }}</strong> {{ t('import.syncHelpEnd') }}
      </p>
    </div>

    <p class="text-center text-sm mt-6">
      <RouterLink to="/settings" class="text-brand-blue font-semibold underline underline-offset-2">{{ t('import.backSettings') }}</RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, type ApiAccount } from '@/services/api'
import { useWalletStore } from '@/stores/wallet'
import { resolveApiErrorI18nKey } from '@/utils/apiErrorMap'

const store = useWalletStore()
const { t, locale } = useI18n()

const accounts = ref<ApiAccount[]>([])
const loadingAccounts = ref(true)
const accountId = ref('')
const file = ref<File | null>(null)
const fileName = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref<false | 'import' | 'sync'>(false)
const errorMsg = ref('')
const successMsg = ref('')

const canSubmit = computed(() => Boolean(accountId.value && file.value))
const localeTag = computed(() => (locale.value === 'en' ? 'en-US' : locale.value === 'de' ? 'de-DE' : 'es-ES'))

function formatAccountOption(account: ApiAccount): string {
  const currency = account.currency || 'EUR'
  const rawBalance = Number(account.balance ?? 0)
  const formattedBalance = Number.isFinite(rawBalance)
    ? rawBalance.toLocaleString(localeTag.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'
  return `${account.name} - ${formattedBalance} ${currency}`
}

function onFile(ev: Event): void {
  const input = ev.target as HTMLInputElement
  const f = input.files?.[0]
  file.value = f ?? null
  fileName.value = f ? f.name : ''
  errorMsg.value = ''
  successMsg.value = ''
}

onMounted(async () => {
  try {
    accounts.value = await api.getAccounts()
    if (accounts.value.length === 1) accountId.value = accounts.value[0].id
  } catch {
    errorMsg.value = t('import.loadAccountsError')
  } finally {
    loadingAccounts.value = false
  }
})

async function submit(): Promise<void> {
  if (!canSubmit.value || !file.value) return
  errorMsg.value = ''
  successMsg.value = ''
  busy.value = 'import'
  try {
    const r = await api.importIngBankXlsx(accountId.value, file.value)
    const parts: string[] = [
      t('import.successImported', { count: r.imported }),
    ]
    if (r.skippedDuplicates > 0) {
      parts.push(t('import.successSkippedDuplicates', { count: r.skippedDuplicates }))
    }
    if (r.firstDateImported && r.lastDateImported) {
      parts.push(t('import.successDateRange', { from: r.firstDateImported, to: r.lastDateImported }))
    }
    if (r.balanceFromStatement != null) {
      parts.push(
        t('import.successBalanceUpdated', {
          amount: r.balanceFromStatement.toLocaleString(localeTag.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        })
      )
    }
    successMsg.value = parts.join(' ')
    await store.initialize()
    file.value = null
    fileName.value = ''
    if (fileInput.value) fileInput.value.value = ''
  } catch (e: unknown) {
    errorMsg.value = t(resolveApiErrorI18nKey(e, 'import.importError'))
  } finally {
    busy.value = false
  }
}

async function submitSyncBalanceOnly(): Promise<void> {
  if (!canSubmit.value || !file.value) return
  errorMsg.value = ''
  successMsg.value = ''
  busy.value = 'sync'
  try {
    const r = await api.syncBalanceIngBankXlsx(accountId.value, file.value)
    successMsg.value = t('import.successSyncBalance', {
      amount: r.balance.toLocaleString(localeTag.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    })
    await store.initialize()
  } catch (e: unknown) {
    errorMsg.value = t(resolveApiErrorI18nKey(e, 'import.syncError'))
  } finally {
    busy.value = false
  }
}
</script>
