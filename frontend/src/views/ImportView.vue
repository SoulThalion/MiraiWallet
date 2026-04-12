<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto max-w-2xl">
    <div class="mw-card mb-6">
      <p class="font-display font-extrabold text-lg dark:text-dark-txt text-light-txt">Importar movimientos ING</p>
      <p class="text-sm mt-2 dark:text-dark-txt2 text-light-txt2 leading-relaxed">
        Sube el Excel <strong class="dark:text-dark-txt text-light-txt">«Movimientos de la Cuenta»</strong> que descargas desde ING.
        Se leen las columnas <strong>F. VALOR</strong>, <strong>DESCRIPCIÓN</strong> e <strong>IMPORTE (€)</strong> (y categorías si existen).
        Se importan <strong>todas las filas válidas</strong> que vengan en el Excel (el banco suele limitar el periodo; nosotros no acotamos fechas en código).
        Los importes negativos se registran como <strong>gastos</strong> y los positivos como <strong>ingresos</strong>.
        Si el Excel incluye la columna <strong>Saldo</strong>, el saldo de la cuenta se fija al valor del <strong>último movimiento</strong> (como en el extracto del banco); si no, se sigue sumando sobre el saldo que ya tenía la cuenta en la app.
        Los <strong>traspasos a ahorro</strong> (p. ej. redondeos con categoría «Ahorro») se guardan como traspaso: bajan el saldo de la cuenta pero <strong>no cuentan como gasto</strong> en el resumen de ingresos − gastos.
      </p>
    </div>

    <div class="mw-card space-y-4">
      <div>
        <label for="import-account" class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">
          Cuenta destino
        </label>
        <select
          id="import-account"
          v-model="accountId"
          class="mw-input"
          :disabled="loadingAccounts"
        >
          <option value="" disabled>{{ loadingAccounts ? 'Cargando…' : 'Elige una cuenta' }}</option>
          <option v-for="a in accounts" :key="a.id" :value="a.id">
            {{ a.name }} — {{ a.balance?.toFixed?.(2) ?? a.balance }} {{ a.currency }}
          </option>
        </select>
      </div>

      <div>
        <label for="import-file" class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">
          Archivo Excel (.xlsx)
        </label>
        <input
          id="import-file"
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          class="block w-full text-sm dark:text-dark-txt2 text-light-txt2 file:mr-3 file:rounded-xl file:border-0 file:px-4 file:py-2 file:font-semibold file:bg-brand-blue file:text-white"
          @change="onFile"
        />
        <p v-if="fileName" class="mt-1 text-xs dark:text-dark-txt3 text-light-txt3">{{ fileName }}</p>
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
          {{ busy === 'import' ? 'Importando…' : 'Importar movimientos' }}
        </button>
        <button
          type="button"
          class="flex-1 rounded-xl px-4 py-3.5 text-sm font-semibold border transition-colors dark:bg-dark-surf dark:border-white/[0.12] dark:text-dark-txt dark:hover:border-brand-blue/40 bg-light-surf border-brand-blue/15 text-light-txt hover:border-brand-blue/30 disabled:opacity-50"
          :disabled="!canSubmit || busy"
          @click="submitSyncBalanceOnly"
        >
          {{ busy === 'sync' ? 'Alineando…' : 'Solo alinear saldo' }}
        </button>
      </div>
      <p class="text-xs dark:text-dark-txt2 text-light-txt2 leading-relaxed">
        «Solo alinear saldo» no duplica movimientos: lee el <strong>Saldo</strong> del último movimiento del Excel y actualiza la cuenta. Úsalo si ya importaste y el saldo no coincide con el banco.
      </p>
    </div>

    <p class="text-center text-sm mt-6">
      <RouterLink to="/settings" class="text-brand-blue font-semibold underline underline-offset-2">Volver a ajustes</RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api, type ApiAccount } from '@/services/api'
import { useWalletStore } from '@/stores/wallet'

const store = useWalletStore()

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
    errorMsg.value = 'No se pudieron cargar las cuentas.'
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
    successMsg.value =
      `Importados ${r.imported} movimientos nuevos.` +
      (r.skippedDuplicates > 0
        ? ` Omitidos ${r.skippedDuplicates} que ya estaban (misma fecha, importe y concepto).`
        : '') +
      (r.firstDateImported && r.lastDateImported
        ? ` Rango de fechas: ${r.firstDateImported} → ${r.lastDateImported}.`
        : '') +
      (r.balanceFromStatement != null
        ? ` Saldo de la cuenta actualizado según el extracto: ${r.balanceFromStatement.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €.`
        : '')
    await store.initialize()
    file.value = null
    fileName.value = ''
    if (fileInput.value) fileInput.value.value = ''
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: { message?: string } } } }
    errorMsg.value = ax.response?.data?.error?.message ?? 'No se pudo importar el archivo.'
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
    successMsg.value = `Saldo de la cuenta actualizado a ${r.balance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € (según columna Saldo del extracto).`
    await store.initialize()
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: { message?: string } } } }
    errorMsg.value = ax.response?.data?.error?.message ?? 'No se pudo alinear el saldo.'
  } finally {
    busy.value = false
  }
}
</script>
