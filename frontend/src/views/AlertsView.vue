<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

      <!-- Alerts column: full on mobile/tablet, 2/3 on desktop -->
      <div class="lg:col-span-2 flex flex-col gap-3">
        <div class="flex items-center gap-3 mb-1">
          <span v-if="store.alerts.length" class="bg-red-400/15 text-red-400 text-xs font-bold px-2.5 py-1 rounded-lg">
            {{ store.alerts.length }} nuevas
          </span>
          <span v-else class="text-sm dark:text-dark-txt2 text-light-txt2">Sin alertas pendientes 🎉</span>
        </div>

        <AlertCard
          v-for="alert in store.alerts" :key="alert.id"
          :alert="alert"
          @dismiss="store.dismissAlert($event)"
          @action="handleAction" />
      </div>

      <!-- Budget sidebar: stacks below on mobile/tablet, right col on desktop -->
      <div class="lg:col-span-1 flex flex-col gap-4">
        <div class="mw-card">
          <div class="flex justify-between items-center mb-4">
            <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">Presupuesto mensual</p>
            <p class="text-xs dark:text-dark-txt2 text-light-txt2">€{{ store.totalSpent }} / €{{ store.totalBudget }}</p>
          </div>
          <!-- Overall progress -->
          <div class="mb-4">
            <div class="h-2 rounded-full overflow-hidden mb-1 dark:bg-dark-surf bg-light-surf">
              <div class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-brand-blue-dark to-brand-blue"
                   :style="{ width: Math.min(100, Math.round(store.totalSpent / store.totalBudget * 100)) + '%' }"></div>
            </div>
            <p class="text-xs text-right dark:text-dark-txt2 text-light-txt2">
              {{ Math.round(store.totalSpent / store.totalBudget * 100) }}% utilizado
            </p>
          </div>
          <BudgetBar v-for="cat in store.categories" :key="cat.name" :category="cat" />
        </div>

        <!-- Tips card (desktop only) -->
        <div class="mw-card hidden lg:block">
          <p class="font-display font-bold text-sm mb-3 dark:text-dark-txt text-light-txt">💡 Consejo del mes</p>
          <p class="text-xs leading-relaxed dark:text-dark-txt2 text-light-txt2">
            Tu gasto en ocio superó el presupuesto este mes. Considera transferir el excedente a ahorro para el próximo período.
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { useWalletStore } from '@/stores/wallet'
import AlertCard from '@/components/AlertCard.vue'
import BudgetBar from '@/components/BudgetBar.vue'

const store = useWalletStore()

async function handleAction({ alertId }: { alertId: number }): Promise<void> {
  await store.dismissAlert(alertId)
}
</script>
