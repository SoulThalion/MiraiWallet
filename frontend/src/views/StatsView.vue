<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">

    <!-- Month filter -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-1">
      <button v-for="m in months" :key="m"
              :class="['flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border',
                       selectedMonth === m
                         ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
                         : isDark ? 'bg-dark-card border-white/[0.07] text-dark-txt2' : 'bg-light-card border-brand-blue/10 text-light-txt2']"
              @click="selectedMonth = m">
        {{ m }}
      </button>
    </div>

    <!-- GRID: 1 col → 2 col md → 3 col lg -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

      <!-- Donut chart -->
      <div class="mw-card md:col-span-1">
        <p :class="['text-xs mb-4', isDark ? 'text-dark-txt2' : 'text-light-txt2']">Distribución — {{ selectedMonth }}</p>
        <DonutChart :segments="store.donutSegments" :centerLabel="'€' + store.totalSpent.toLocaleString('es-ES')" />
      </div>

      <!-- Bar chart — wider on desktop -->
      <div class="mw-card md:col-span-1 lg:col-span-2">
        <p :class="['text-xs mb-4', isDark ? 'text-dark-txt2' : 'text-light-txt2']">Gasto mensual — últimos 6 meses</p>
        <BarChart :bars="store.monthlyData" :maxVal="store.maxBar" />
      </div>

      <!-- Average cards -->
      <div class="mw-card">
        <p :class="['text-xs mb-1', isDark ? 'text-dark-txt2' : 'text-light-txt2']">Promedio mensual</p>
        <p :class="['font-display font-extrabold text-2xl md:text-3xl', isDark ? 'text-dark-txt' : 'text-light-txt']">
          €{{ store.monthlyAverage.toLocaleString('es-ES') }}
        </p>
        <p class="text-xs text-brand-green mt-1">▼ 6.4% respecto al período anterior</p>
      </div>

      <div class="mw-card">
        <p :class="['text-xs mb-1', isDark ? 'text-dark-txt2' : 'text-light-txt2']">Mejor mes</p>
        <p :class="['font-display font-extrabold text-2xl md:text-3xl', isDark ? 'text-dark-txt' : 'text-light-txt']">
          €{{ store.bestMonth.amount.toLocaleString('es-ES') }}
        </p>
        <p :class="['text-xs mt-1', isDark ? 'text-dark-txt2' : 'text-light-txt2']">{{ store.bestMonth.month }} 2024</p>
      </div>

      <div class="mw-card">
        <p :class="['text-xs mb-1', isDark ? 'text-dark-txt2' : 'text-light-txt2']">Total gastado</p>
        <p :class="['font-display font-extrabold text-2xl md:text-3xl', isDark ? 'text-dark-txt' : 'text-light-txt']">
          €{{ store.totalSpent.toLocaleString('es-ES') }}
        </p>
        <p :class="['text-xs mt-1', isDark ? 'text-dark-txt2' : 'text-light-txt2']">de €{{ store.totalBudget }} presupuestado</p>
      </div>

      <!-- Category breakdown — full width on all sizes -->
      <div class="mw-card md:col-span-2 lg:col-span-3">
        <p :class="['font-display font-bold text-sm mb-4', isDark ? 'text-dark-txt' : 'text-light-txt']">Desglose por categoría</p>
        <!-- 1 col mobile, 2 col md+, 3 col lg+ -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
          <div v-for="cat in store.categories" :key="cat.name">
            <div class="flex justify-between mb-1.5">
              <span :class="['text-xs font-medium', isDark ? 'text-dark-txt2' : 'text-light-txt2']">{{ cat.icon }} {{ cat.name }}</span>
              <span :class="['text-xs font-bold', isDark ? 'text-dark-txt' : 'text-light-txt']">
                €{{ cat.spent }} <span :class="['font-normal', isDark ? 'text-dark-txt2' : 'text-light-txt2']">/ €{{ cat.budget }}</span>
              </span>
            </div>
            <div :class="['h-1.5 rounded-full overflow-hidden', isDark ? 'bg-dark-surf' : 'bg-light-surf']">
              <div class="h-full rounded-full transition-all duration-500"
                   :style="{ width: Math.min(100, Math.round(cat.spent / cat.budget * 100)) + '%', background: cat.color }"></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref }            from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useTheme }       from '@/composables/useTheme'
import DonutChart         from '@/components/DonutChart.vue'
import BarChart           from '@/components/BarChart.vue'

const store         = useWalletStore()
const { isDark }    = useTheme()
const months        = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
const selectedMonth = ref('Mar')
</script>
