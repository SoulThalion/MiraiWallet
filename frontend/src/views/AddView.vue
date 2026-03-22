<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <div class="max-w-2xl mx-auto">

      <!-- Amount display -->
      <div :class="[
        'rounded-3xl p-6 md:p-8 mb-6 text-center relative overflow-hidden',
        isDark ? 'bg-gradient-to-br from-[#091A30] to-dark-card' : 'bg-gradient-to-br from-[#D8E8FA] to-light-card border border-brand-blue/10'
      ]">
        <p :class="['text-xs uppercase tracking-widest mb-3', isDark ? 'text-dark-txt3' : 'text-light-txt3']">Importe a registrar</p>
        <p :class="['font-display font-black text-5xl md:text-6xl tracking-tighter', isDark ? 'text-dark-txt' : 'text-light-txt']">
          <span :class="['text-2xl font-semibold mr-1', isDark ? 'text-dark-txt2' : 'text-light-txt2']">€</span>
          {{ displayAmount || '0,00' }}
        </p>
      </div>

      <!-- Form card -->
      <div class="mw-card">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div class="ff">
            <label :class="fieldLabelClass">Descripción</label>
            <input v-model="form.description" class="mw-input" placeholder="Ej: Cena restaurante..." />
          </div>

          <div class="ff">
            <label :class="fieldLabelClass">Importe (€)</label>
            <input v-model="form.amount" class="mw-input" type="number" step="0.01" min="0" placeholder="0,00" />
          </div>

          <div class="ff md:col-span-2">
            <label :class="fieldLabelClass">Categoría</label>
            <div class="flex flex-wrap gap-2 mt-1">
              <button v-for="cat in store.categories" :key="cat.name"
                      :class="['px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5',
                               form.category === cat.name
                                 ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
                                 : isDark ? 'bg-dark-surf border-white/[0.07] text-dark-txt2 hover:border-brand-blue/30' : 'bg-light-surf border-brand-blue/10 text-light-txt2 hover:border-brand-blue/30']"
                      @click="form.category = cat.name">
                {{ cat.icon }} {{ cat.name }}
              </button>
            </div>
          </div>

          <div class="ff">
            <label :class="fieldLabelClass">Fecha</label>
            <input v-model="form.date" class="mw-input" type="date" />
          </div>

          <div class="ff">
            <label :class="fieldLabelClass">Nota (opcional)</label>
            <input v-model="form.note" class="mw-input" placeholder="Añade una nota..." />
          </div>

          <div class="ff md:col-span-2">
            <label :class="fieldLabelClass">Importar desde banco</label>
            <div class="flex flex-col sm:flex-row gap-2 mt-1">
              <button v-for="opt in importOptions" :key="opt.label"
                      :class="['flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors',
                               isDark ? 'bg-dark-surf border-white/[0.07] text-dark-txt2 hover:border-brand-green hover:text-brand-green' : 'bg-light-surf border-brand-blue/10 text-light-txt2 hover:border-brand-green hover:text-brand-green']">
                {{ opt.icon }} {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-3 mt-6">
          <RouterLink to="/home" class="flex-1">
            <button :class="['w-full py-3.5 rounded-xl text-sm font-semibold border transition-colors', isDark ? 'bg-dark-surf border-white/[0.07] text-dark-txt2 hover:border-brand-blue/30' : 'bg-light-surf border-brand-blue/10 text-light-txt2']">
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useTheme } from '@/composables/useTheme'

interface FormData {
  description: string
  amount: string
  category: string
  date: string
  note: string
}

interface ImportOption {
  icon: string
  label: string
}

const store = useWalletStore()
const router = useRouter()
const { isDark } = useTheme()

const fieldLabelClass = computed<string>(() =>
  ['block text-xs uppercase tracking-wider mb-1.5 font-semibold', isDark.value ? 'text-dark-txt2' : 'text-light-txt2'].join(' ')
)

const form = ref<FormData>({ description: '', amount: '', category: 'Hogar', date: new Date().toISOString().split('T')[0], note: '' })
const displayAmount = computed<string>(() => form.value.amount ? parseFloat(form.value.amount).toFixed(2).replace('.', ',') : '')
const isValid = computed<boolean>(() => form.value.description.trim().length > 0 && parseFloat(form.value.amount) > 0)
const importOptions: ImportOption[] = [{ icon: '🏦', label: 'Conectar banco' }, { icon: '📄', label: 'Subir CSV / Excel' }]

function save(): void {
  if (!isValid.value) return
  store.addTransaction(form.value)
  router.push('/home')
}
</script>
