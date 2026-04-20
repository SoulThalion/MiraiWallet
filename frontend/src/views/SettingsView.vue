<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <RouterLink
      to="/budgets"
      class="mw-card mb-4 md:mb-6 flex items-center gap-4 border transition-colors hover:border-brand-blue/40 dark:hover:border-brand-blue/40"
    >
      <div class="w-12 h-12 rounded-2xl bg-brand-green/15 flex items-center justify-center text-2xl flex-shrink-0">🎯</div>
      <div class="flex-1 min-w-0">
        <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">{{ t('budgets.title') }}</p>
        <p class="text-xs mt-0.5 dark:text-dark-txt2 text-light-txt2">{{ t('settings.budgetsShortcutDesc') }}</p>
      </div>
      <span class="text-lg dark:text-dark-txt3 text-light-txt3 flex-shrink-0">›</span>
    </RouterLink>

    <RouterLink
      to="/import"
      class="mw-card mb-4 md:mb-6 flex items-center gap-4 border transition-colors hover:border-brand-blue/40 dark:hover:border-brand-blue/40"
    >
      <div class="w-12 h-12 rounded-2xl bg-brand-blue/15 flex items-center justify-center text-2xl flex-shrink-0">📥</div>
      <div class="flex-1 min-w-0">
        <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">{{ t('settings.importIng') }}</p>
        <p class="text-xs mt-0.5 dark:text-dark-txt2 text-light-txt2">{{ t('settings.importIngDesc') }}</p>
      </div>
      <span class="text-lg dark:text-dark-txt3 text-light-txt3 flex-shrink-0">›</span>
    </RouterLink>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

      <!-- Profile card -->
      <div class="mw-card md:col-span-2 lg:col-span-1">
        <div class="flex items-center gap-4 mb-5">
          <div class="w-14 h-14 rounded-[18px] bg-gradient-to-br from-brand-blue-dark to-brand-blue flex items-center justify-center font-display font-black text-lg text-white shadow-glow flex-shrink-0">
            {{ store.userInitials }}
          </div>
          <div>
            <p class="font-display font-extrabold text-base dark:text-dark-txt text-light-txt">{{ store.userDisplayName }}</p>
            <p class="text-xs mt-0.5 dark:text-dark-txt2 text-light-txt2">{{ store.user?.email ?? '—' }}</p>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <button type="button" class="w-full py-3 rounded-xl text-sm font-semibold border border-red-400/30 text-red-400 dark:bg-dark-surf bg-light-surf hover:bg-red-400/10 transition-colors" @click="onLogout">
            {{ t('settings.logout') }}
          </button>
          <div v-for="toggle in toggles" :key="toggle.label"
               class="flex items-center justify-between rounded-xl px-4 py-3 border dark:bg-dark-surf dark:border-white/[0.07] bg-light-surf border-brand-blue/10">
            <span class="text-sm font-medium dark:text-dark-txt text-light-txt">{{ toggle.label }}</span>
            <button :class="['w-10 h-[22px] rounded-full relative transition-colors', toggle.value ? 'bg-brand-blue' : 'dark:bg-dark-elev bg-light-elev']"
                    @click="toggle.value = !toggle.value">
              <span :class="['absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all', toggle.value ? 'right-[3px]' : 'left-[3px]']"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- General settings -->
      <div class="mw-card md:col-span-2 lg:col-span-2">
        <p class="font-display font-bold text-sm mb-3 dark:text-dark-txt text-light-txt">{{ t('settings.configuration') }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="item in settingItems" :key="item.label"
               class="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer border transition-colors hover:border-brand-blue/30 dark:bg-dark-surf dark:border-white/[0.07] bg-light-surf border-brand-blue/10">
            <div :class="['w-9 h-9 rounded-[10px] flex items-center justify-center text-base flex-shrink-0', item.bg]">{{ item.icon }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate dark:text-dark-txt text-light-txt">{{ item.label }}</p>
              <p class="text-[10px] truncate dark:text-dark-txt2 text-light-txt2">{{ item.sub }}</p>
            </div>
            <span class="text-sm flex-shrink-0 dark:text-dark-txt3 text-light-txt3">›</span>
          </div>
        </div>
      </div>

      <!-- Theme card — full row -->
      <div class="mw-card md:col-span-2 lg:col-span-3">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">{{ t('settings.appearance') }}</p>
            <p class="text-xs mt-0.5 dark:text-dark-txt2 text-light-txt2">{{ t('settings.currentlyMode') }} <span class="dark:hidden">{{ t('settings.light') }}</span><span class="hidden dark:inline">{{ t('settings.dark') }}</span></p>
          </div>
          <div class="flex gap-2">
            <button v-for="mode in [t('settings.light'), t('settings.dark')]" :key="mode"
                    :class="['flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                             mode === t('settings.dark')
                               ? 'dark:bg-brand-blue/10 dark:border-brand-blue dark:text-brand-blue bg-light-surf border-brand-blue/10 text-light-txt2'
                               : 'dark:bg-dark-surf dark:border-white/[0.07] dark:text-dark-txt2 bg-brand-blue/10 border-brand-blue text-brand-blue']"
                    @click="toggleMode(mode)">
              {{ mode === t('settings.light') ? '☀️' : '🌙' }} {{ mode }}
            </button>
          </div>
        </div>
      </div>

      <!-- Ciclo mensual (presupuestos, estadísticas, gasto del mes) -->
      <div class="mw-card md:col-span-2 lg:col-span-3">
        <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">{{ t('settings.cycle.title') }}</p>
        <p class="mt-1 text-xs leading-relaxed dark:text-dark-txt2 text-light-txt2 max-w-3xl">
          {{ t('settings.cycle.introStart') }}
          <span class="font-mono text-[10px]">YYYY-MM</span>. {{ t('settings.cycle.introMiddle') }}
          <strong class="dark:text-dark-txt text-light-txt">{{ t('settings.cycle.naturalMonth') }}</strong> {{ t('settings.cycle.introOr') }}
          <strong class="dark:text-dark-txt text-light-txt">{{ t('settings.cycle.dayRange') }}</strong> {{ t('settings.cycle.introExample') }}
          <strong class="dark:text-dark-txt text-light-txt">{{ t('settings.cycle.previousMonthAnchor') }}</strong> {{ t('settings.cycle.introOrIf') }}
          <strong class="dark:text-dark-txt text-light-txt">{{ t('settings.cycle.currentMonthAnchor') }}</strong> {{ t('settings.cycle.introEnd') }}
        </p>

        <fieldset class="mt-4 space-y-3">
          <legend class="sr-only">{{ t('settings.cycle.periodType') }}</legend>
          <div class="flex flex-wrap gap-3">
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm dark:border-white/[0.08] border-brand-blue/12 dark:bg-dark-surf bg-light-surf has-[:checked]:border-brand-blue has-[:checked]:bg-brand-blue/10">
              <input v-model="cycleMode" type="radio" value="calendar" class="accent-brand-blue" />
              <span class="font-medium dark:text-dark-txt text-light-txt">{{ t('settings.cycle.naturalMonth') }}</span>
            </label>
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm dark:border-white/[0.08] border-brand-blue/12 dark:bg-dark-surf bg-light-surf has-[:checked]:border-brand-blue has-[:checked]:bg-brand-blue/10">
              <input v-model="cycleMode" type="radio" value="custom" class="accent-brand-blue" />
              <span class="font-medium dark:text-dark-txt text-light-txt">{{ t('settings.cycle.customPeriod') }}</span>
            </label>
          </div>
        </fieldset>

        <div v-if="cycleMode === 'custom'" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label for="cycle-start" class="block text-xs font-semibold mb-1.5 dark:text-dark-txt2 text-light-txt2">
              {{ t('settings.cycle.startDay') }}
            </label>
            <input
              id="cycle-start"
              v-model.number="cycleStartDay"
              type="number"
              min="1"
              max="31"
              step="1"
              class="mw-input tabular-nums w-full"
              autocomplete="off"
            />
          </div>
          <div>
            <label for="cycle-end" class="block text-xs font-semibold mb-1.5 dark:text-dark-txt2 text-light-txt2">
              {{ t('settings.cycle.endDay') }}
            </label>
            <input
              id="cycle-end"
              v-model.number="cycleEndDay"
              type="number"
              min="1"
              max="31"
              step="1"
              class="mw-input tabular-nums w-full"
              autocomplete="off"
            />
          </div>
          <div class="sm:col-span-2 lg:col-span-1">
            <span class="block text-xs font-semibold mb-1.5 dark:text-dark-txt2 text-light-txt2">{{ t('settings.cycle.anchor') }}</span>
            <select
              v-model="cycleAnchor"
              class="mw-input w-full text-sm"
              :aria-label="t('settings.cycle.anchor')"
            >
              <option value="previous">{{ t('settings.cycle.anchorPrevious') }}</option>
              <option value="current">{{ t('settings.cycle.anchorCurrent') }}</option>
            </select>
          </div>
        </div>

        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <button
            type="button"
            class="rounded-xl px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-br from-brand-blue-dark to-brand-blue shadow-glow transition-opacity hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none sm:self-end"
            :disabled="cycleSaving || !cycleDirty"
            @click="saveCycle"
          >
            {{ cycleSaving ? t('settings.cycle.saving') : t('common.save') }}
          </button>
        </div>
      </div>

      <!-- Danger zone -->
      <div class="mw-card md:col-span-2 lg:col-span-3 border border-red-400/30 dark:border-red-400/25">
        <p class="font-display font-bold text-sm text-red-500 mb-1">{{ t('settings.dangerZone') }}</p>
        <p class="text-xs dark:text-dark-txt2 text-light-txt2 mb-4 max-w-2xl">
          {{ t('settings.dangerBody') }}
        </p>
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-500/40 text-red-500 dark:bg-dark-surf bg-light-surf hover:bg-red-500/10 transition-colors"
          @click="openWipeModal"
        >
          {{ t('settings.wipeAllMovements') }}
        </button>
      </div>

      <!-- Version -->
      <div class="md:col-span-2 lg:col-span-3 flex items-center justify-center gap-2 py-2 opacity-40">
        <span class="text-xs dark:text-dark-txt2 text-light-txt2">{{ t('settings.version', { version: '2.1.0' }) }}</span>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showWipeModal"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
        role="presentation"
        @click.self="closeWipeModal"
      >
        <div
          class="mw-card max-w-md w-full space-y-4 shadow-xl border border-red-400/20"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wipe-modal-title"
          @click.stop
        >
          <div>
            <h2 id="wipe-modal-title" class="font-display font-bold text-lg text-red-500">{{ t('settings.wipeModal.title') }}</h2>
            <p class="text-sm mt-2 dark:text-dark-txt2 text-light-txt2 leading-relaxed">
              {{ t('settings.wipeModal.body') }}
            </p>
          </div>

          <div>
            <label for="wipe-password" class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">
              {{ t('settings.wipeModal.passwordLabel') }}
            </label>
            <div class="relative">
              <input
                id="wipe-password"
                v-model="wipePassword"
                :type="showWipePassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="mw-input pr-11"
                :placeholder="t('settings.wipeModal.passwordPlaceholder')"
                @keydown.enter="canConfirmWipe && confirmWipe()"
              />
              <PasswordRevealToggle v-model="showWipePassword" />
            </div>
            <p v-if="wipeError" class="mt-2 text-xs text-red-400">{{ wipeError }}</p>
          </div>

          <div class="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl text-sm font-semibold border dark:border-white/[0.12] border-brand-blue/15 dark:text-dark-txt2 text-light-txt2 hover:opacity-90"
              :disabled="wipeSubmitting"
              @click="closeWipeModal"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:pointer-events-none"
              :disabled="!canConfirmWipe || wipeSubmitting"
              @click="confirmWipe"
            >
              {{ wipeSubmitting ? t('settings.wipeModal.deleting') : t('settings.wipeModal.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/services/api'
import PasswordRevealToggle from '@/components/PasswordRevealToggle.vue'
import { resolveApiErrorI18nKey } from '@/utils/apiErrorMap'
import { useToast } from '@/composables/useToast'

interface Toggle {
  label: string
  value: boolean
}

interface SettingItem {
  icon: string
  label: string
  sub: string
  bg: string
}

const store = useWalletStore()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()

type CycleModeUi = 'calendar' | 'custom'

const cycleMode = ref<CycleModeUi>('calendar')
const cycleStartDay = ref(1)
const cycleEndDay = ref(31)
const cycleAnchor = ref<'previous' | 'current'>('previous')
const cycleSaving = ref(false)

function clampDay(n: unknown, fallback: number): number {
  const x = Math.floor(Number(n))
  if (!Number.isInteger(x) || x < 1 || x > 31) return fallback
  return x
}

watch(
  () => store.user,
  (u) => {
    cycleMode.value = u?.monthCycleMode === 'custom' ? 'custom' : 'calendar'
    cycleStartDay.value = clampDay(u?.monthCycleStartDay, 1)
    cycleEndDay.value = clampDay(u?.monthCycleEndDay, 31)
    cycleAnchor.value = u?.monthCycleAnchor === 'current' ? 'current' : 'previous'
  },
  { immediate: true, deep: true }
)

const cycleDirty = computed(() => {
  const u = store.user
  const curMode: CycleModeUi = u?.monthCycleMode === 'custom' ? 'custom' : 'calendar'
  const curStart = clampDay(u?.monthCycleStartDay, 1)
  const curEnd = clampDay(u?.monthCycleEndDay, 31)
  const curAnchor = u?.monthCycleAnchor === 'current' ? 'current' : 'previous'
  if (cycleMode.value !== curMode) return true
  if (cycleMode.value === 'calendar') return false
  const st = clampDay(cycleStartDay.value, 1)
  const en = clampDay(cycleEndDay.value, 31)
  return st !== curStart || en !== curEnd || cycleAnchor.value !== curAnchor
})

async function saveCycle(): Promise<void> {
  cycleStartDay.value = clampDay(cycleStartDay.value, 1)
  cycleEndDay.value = clampDay(cycleEndDay.value, 31)
  cycleSaving.value = true
  try {
    if (cycleMode.value === 'calendar') {
      await api.updateProfile({ monthCycleMode: 'calendar' })
    } else {
      await api.updateProfile({
        monthCycleMode: 'custom',
        monthCycleStartDay: cycleStartDay.value,
        monthCycleEndDay: cycleEndDay.value,
        monthCycleAnchor: cycleAnchor.value,
      })
    }
    await store.loadUser()
    toast.success(t('settings.cycle.saved'))
  } catch (e: unknown) {
    toast.error(t(resolveApiErrorI18nKey(e, 'settings.cycle.saveError')))
  } finally {
    cycleSaving.value = false
  }
}

const showWipeModal = ref(false)
const wipePassword = ref('')
const wipeError = ref<string | null>(null)
const wipeSubmitting = ref(false)
const showWipePassword = ref(false)

const canConfirmWipe = computed(() => wipePassword.value.trim().length > 0)

async function onLogout(): Promise<void> {
  await store.logout()
  await router.replace({ name: 'login' })
}

function openWipeModal(): void {
  wipePassword.value = ''
  wipeError.value = null
  showWipePassword.value = false
  showWipeModal.value = true
}

function closeWipeModal(): void {
  if (wipeSubmitting.value) return
  showWipeModal.value = false
  wipePassword.value = ''
  wipeError.value = null
}

async function confirmWipe(): Promise<void> {
  if (!canConfirmWipe.value || wipeSubmitting.value) return
  wipeError.value = null
  wipeSubmitting.value = true
  try {
    await api.wipeFinancialData(wipePassword.value)
    showWipeModal.value = false
    wipePassword.value = ''
    await store.initialize()
    toast.success(t('common.saved'))
  } catch (e: unknown) {
    wipeError.value = t(resolveApiErrorI18nKey(e, 'settings.wipeModal.error'))
    toast.error(wipeError.value)
  } finally {
    wipeSubmitting.value = false
  }
}

const toggles = reactive<Toggle[]>([
  { label: t('settings.smartAlerts'), value: true },
  { label: t('settings.pushNotifications'), value: true },
])

const settingItems = computed<SettingItem[]>(() => [
  { icon: '💳', label: t('settings.items.bankAccounts'), sub: t('settings.items.bankAccountsSub'), bg: 'bg-brand-blue/10' },
  { icon: '🎯', label: t('settings.items.monthlyBudget'), sub: t('settings.items.monthlyBudgetSub'), bg: 'bg-brand-green/10' },
  { icon: '🏷️', label: t('settings.items.categories'), sub: t('settings.items.categoriesSub'), bg: 'bg-brand-gold/10' },
  { icon: '🔒', label: t('settings.items.privacy'), sub: t('settings.items.privacySub'), bg: 'bg-purple-400/10' },
  { icon: '📤', label: t('settings.items.exportData'), sub: t('settings.items.exportDataSub'), bg: 'bg-red-400/10' },
  { icon: '🔗', label: t('settings.items.integrations'), sub: t('settings.items.integrationsSub'), bg: 'bg-brand-gold/10' },
])

const toggleMode = (mode: string): void => {
  const wantDark = mode === t('settings.dark')
  if (wantDark !== store.darkMode) {
    store.toggleDark()
  }
}
</script>
