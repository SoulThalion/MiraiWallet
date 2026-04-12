<template>
  <div class="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
    <RouterLink
      to="/import"
      class="mw-card mb-4 md:mb-6 flex items-center gap-4 border transition-colors hover:border-brand-blue/40 dark:hover:border-brand-blue/40"
    >
      <div class="w-12 h-12 rounded-2xl bg-brand-blue/15 flex items-center justify-center text-2xl flex-shrink-0">📥</div>
      <div class="flex-1 min-w-0">
        <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">Importar Excel ING</p>
        <p class="text-xs mt-0.5 dark:text-dark-txt2 text-light-txt2">Sube el Excel «Movimientos de la Cuenta» de ING y guárdalo en la app</p>
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
            Cerrar sesión
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
        <p class="font-display font-bold text-sm mb-3 dark:text-dark-txt text-light-txt">Configuración</p>
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
            <p class="font-display font-bold text-sm dark:text-dark-txt text-light-txt">Apariencia</p>
            <p class="text-xs mt-0.5 dark:text-dark-txt2 text-light-txt2">Actualmente en modo <span class="dark:hidden">claro</span><span class="hidden dark:inline">oscuro</span></p>
          </div>
          <div class="flex gap-2">
            <button v-for="mode in ['Claro', 'Oscuro']" :key="mode"
                    :class="['flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                             mode === 'Oscuro'
                               ? 'dark:bg-brand-blue/10 dark:border-brand-blue dark:text-brand-blue bg-light-surf border-brand-blue/10 text-light-txt2'
                               : 'dark:bg-dark-surf dark:border-white/[0.07] dark:text-dark-txt2 bg-brand-blue/10 border-brand-blue text-brand-blue']"
                    @click="toggleMode(mode)">
              {{ mode === 'Claro' ? '☀️' : '🌙' }} {{ mode }}
            </button>
          </div>
        </div>
      </div>

      <!-- Danger zone -->
      <div class="mw-card md:col-span-2 lg:col-span-3 border border-red-400/30 dark:border-red-400/25">
        <p class="font-display font-bold text-sm text-red-500 mb-1">Zona peligrosa</p>
        <p class="text-xs dark:text-dark-txt2 text-light-txt2 mb-4 max-w-2xl">
          Puedes eliminar de un solo golpe todos los movimientos importados o registrados, todas las categorías y subcategorías, y los presupuestos ligados a esas categorías. Tus cuentas se conservan con el saldo puesto a 0 €. Esta acción no se puede deshacer.
        </p>
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-500/40 text-red-500 dark:bg-dark-surf bg-light-surf hover:bg-red-500/10 transition-colors"
          @click="openWipeModal"
        >
          Borrar todos los movimientos
        </button>
      </div>

      <!-- Version -->
      <div class="md:col-span-2 lg:col-span-3 flex items-center justify-center gap-2 py-2 opacity-40">
        <span class="text-xs dark:text-dark-txt2 text-light-txt2">Mirai Wallet v2.1.0</span>
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
            <h2 id="wipe-modal-title" class="font-display font-bold text-lg text-red-500">¿Borrar todos los datos financieros?</h2>
            <p class="text-sm mt-2 dark:text-dark-txt2 text-light-txt2 leading-relaxed">
              Se eliminarán <strong class="dark:text-dark-txt text-light-txt">todos los movimientos</strong>,
              <strong class="dark:text-dark-txt text-light-txt">categorías</strong>,
              <strong class="dark:text-dark-txt text-light-txt">subcategorías</strong> y
              <strong class="dark:text-dark-txt text-light-txt">presupuestos</strong> de tu usuario.
              Las cuentas quedarán con saldo 0 €. No hay forma de recuperar esta información.
            </p>
          </div>

          <div>
            <label for="wipe-password" class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">
              Escribe tu contraseña para confirmar
            </label>
            <div class="relative">
              <input
                id="wipe-password"
                v-model="wipePassword"
                :type="showWipePassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="mw-input pr-11"
                placeholder="Contraseña actual"
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
              Cancelar
            </button>
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:pointer-events-none"
              :disabled="!canConfirmWipe || wipeSubmitting"
              @click="confirmWipe"
            >
              {{ wipeSubmitting ? 'Borrando…' : 'Sí, borrar todo' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/services/api'
import PasswordRevealToggle from '@/components/PasswordRevealToggle.vue'

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
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: { message?: string } } } }
    wipeError.value = ax.response?.data?.error?.message ?? 'No se pudo completar la operación.'
  } finally {
    wipeSubmitting.value = false
  }
}

const toggles = reactive<Toggle[]>([
  { label: 'Alertas inteligentes', value: true },
  { label: 'Notificaciones push', value: true },
])

const settingItems: SettingItem[] = [
  { icon: '💳', label: 'Cuentas bancarias', sub: '2 conectadas', bg: 'bg-brand-blue/10' },
  { icon: '🎯', label: 'Presupuesto mensual', sub: '€2.200 configurado', bg: 'bg-brand-green/10' },
  { icon: '🏷️', label: 'Categorías', sub: 'Personalizar etiquetas', bg: 'bg-brand-gold/10' },
  { icon: '🔒', label: 'Privacidad', sub: 'Face ID activado', bg: 'bg-purple-400/10' },
  { icon: '📤', label: 'Exportar datos', sub: 'PDF, Excel o CSV', bg: 'bg-red-400/10' },
  { icon: '🔗', label: 'Integraciones', sub: 'Bancos y servicios', bg: 'bg-brand-gold/10' },
]

const toggleMode = (mode: string): void => {
  const wantDark = mode === 'Oscuro'
  if (wantDark !== store.darkMode) {
    store.toggleDark()
  }
}
</script>
