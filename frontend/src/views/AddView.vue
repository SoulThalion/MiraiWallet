<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <div class="max-w-2xl mx-auto">

      <!-- Amount display -->
      <div class="rounded-3xl p-6 md:p-8 mb-6 text-center relative overflow-hidden dark:bg-gradient-to-br dark:from-[#091A30] dark:to-dark-card bg-gradient-to-br from-[#D8E8FA] to-light-card border border-brand-blue/10 dark:border-0">
        <p class="text-xs uppercase tracking-widest mb-3 dark:text-dark-txt3 text-light-txt3">Importe (€)</p>
        <p class="font-display font-black text-5xl md:text-6xl tracking-tighter dark:text-dark-txt text-light-txt">
          <span class="text-2xl font-semibold mr-1 dark:text-dark-txt2 text-light-txt2">€</span>
          {{ displayAmount || '0,00' }}
        </p>
      </div>

      <!-- Form card — mismos campos que el Excel ING (sin columna Saldo) -->
      <div class="mw-card">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div class="ff">
            <label :class="fieldLabelClass">F. valor (fecha)</label>
            <input v-model="form.date" class="mw-input" type="date" required />
          </div>

          <div class="ff">
            <label :class="fieldLabelClass">Importe (€)</label>
            <input v-model="form.amount" class="mw-input" type="number" step="0.01" min="0.01" placeholder="0,00" required />
          </div>

          <div class="ff md:col-span-2">
            <label :class="fieldLabelClass">Categoría</label>
            <select v-model="form.categoryId" class="mw-input" required>
              <option value="" disabled>Selecciona categoría</option>
              <option v-for="c in expenseCategories" :key="c.id" :value="c.id">
                {{ c.icon }} {{ c.name }}
              </option>
            </select>
          </div>

          <div class="ff md:col-span-2">
            <label :class="fieldLabelClass">Subcategoría</label>
            <select
              v-model="form.subcategoryId"
              class="mw-input"
              :required="subcategoryRequired"
              :disabled="!subcategoryOptions.length"
            >
              <option value="">{{ subcategoryOptions.length ? 'Selecciona subcategoría' : 'Sin subcategorías en esta categoría' }}</option>
              <option v-for="s in subcategoryOptions" :key="s.id" :value="s.id">
                {{ s.icon }} {{ s.name }}
              </option>
            </select>
          </div>

          <div class="ff md:col-span-2">
            <label :class="fieldLabelClass">Descripción</label>
            <input v-model="form.description" class="mw-input" placeholder="Concepto del movimiento" maxlength="200" required />
          </div>

          <div class="ff md:col-span-2">
            <label :class="fieldLabelClass">Comentario</label>
            <input v-model="form.comment" class="mw-input" placeholder="Opcional, como en el Excel" maxlength="1000" />
          </div>

          <div class="ff md:col-span-2">
            <label :class="fieldLabelClass">Importar desde banco</label>
            <div class="flex flex-col sm:flex-row gap-2 mt-1">
              <button type="button" disabled
                      class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium opacity-45 cursor-not-allowed
                             dark:bg-dark-surf dark:border-white/[0.07] dark:text-dark-txt3 bg-light-surf border-brand-blue/10 text-light-txt3">
                🏦 Conectar banco (pronto)
              </button>
              <RouterLink to="/import"
                          class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors text-center
                                 dark:bg-dark-surf dark:border-white/[0.07] dark:text-dark-txt2 dark:hover:border-brand-green dark:hover:text-brand-green bg-light-surf border-brand-blue/10 text-light-txt2 hover:border-brand-green hover:text-brand-green">
                📄 Excel ING
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-3 mt-6">
          <RouterLink to="/home" class="flex-1">
            <button class="w-full py-3.5 rounded-xl text-sm font-semibold border transition-colors dark:bg-dark-surf dark:border-white/[0.07] dark:text-dark-txt2 dark:hover:border-brand-blue/30 bg-light-surf border-brand-blue/10 text-light-txt2">
              Cancelar
            </button>
          </RouterLink>
          <button class="flex-1 btn-primary !py-3.5 !text-sm" :disabled="!isValid" :class="{ 'opacity-40 cursor-not-allowed': !isValid }" @click="save">
            Guardar gasto
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import type { Category } from '@/stores/wallet'

interface FormData {
  date: string
  categoryId: string
  subcategoryId: string
  description: string
  comment: string
  amount: string
}

const store = useWalletStore()
const router = useRouter()

const fieldLabelClass = 'block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2'

const form = ref<FormData>({
  date: new Date().toISOString().split('T')[0],
  categoryId: '',
  subcategoryId: '',
  description: '',
  comment: '',
  amount: '',
})

const expenseCategories = computed<Category[]>(() =>
  store.categories.filter(c => c.categoryType !== 'income' && c.id)
)

const selectedCategory = computed(() =>
  store.categories.find(c => c.id === form.value.categoryId)
)

const subcategoryOptions = computed(() => selectedCategory.value?.subcategories ?? [])

const subcategoryRequired = computed(() => subcategoryOptions.value.length > 0)

const displayAmount = computed<string>(() =>
  form.value.amount ? parseFloat(form.value.amount).toFixed(2).replace('.', ',') : ''
)

const isValid = computed(() => {
  const amt = parseFloat(form.value.amount)
  if (!form.value.description.trim() || !form.value.date || !form.value.categoryId || !Number.isFinite(amt) || amt <= 0) {
    return false
  }
  if (subcategoryRequired.value && !form.value.subcategoryId) return false
  return true
})

watch(
  () => form.value.categoryId,
  () => {
    form.value.subcategoryId = ''
  }
)

watch(
  expenseCategories,
  (cats) => {
    if (!form.value.categoryId && cats.length > 0) {
      form.value.categoryId = cats[0]!.id!
    }
  },
  { immediate: true }
)

async function save(): Promise<void> {
  if (!isValid.value) return
  try {
    await store.addTransaction({
      description: form.value.description.trim(),
      categoryId: form.value.categoryId,
      subcategoryId: form.value.subcategoryId,
      amount: form.value.amount,
      date: form.value.date,
      note: form.value.comment.trim() || undefined,
    })
    router.push('/home')
  } catch (err) {
    console.error('Error saving transaction:', err)
  }
}
</script>
