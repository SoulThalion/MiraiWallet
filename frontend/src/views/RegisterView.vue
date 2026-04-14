<template>
  <div class="min-h-screen flex items-center justify-center p-4 dark:bg-gradient-to-br dark:from-[#071426] dark:via-dark-bg dark:to-[#071E10] bg-gradient-to-br from-[#D8EAFB] via-light-bg to-[#EAF5EE]">
    <div class="w-full max-w-md mx-auto">
      <div class="text-center mb-8">
        <MwLogo size="md" class="mx-auto mb-4" />
        <p class="font-display font-black text-2xl dark:text-dark-txt text-light-txt">{{ t('auth.registerTitle') }}</p>
        
      </div>

      <form class="mw-card text-left space-y-4" novalidate @submit.prevent="onSubmit">
        <!-- Nombre -->
        <div>
          <label for="reg-name" class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">
            {{ t('auth.fullName') }}
          </label>
          <input
            id="reg-name"
            v-model="name"
            type="text"
            autocomplete="name"
            maxlength="100"
            class="mw-input"
            :class="inputRing('name')"
            placeholder="Ej. María López"
            @blur="touch('name')"
          />
          <p v-if="msg('name')" class="mt-1 text-xs text-red-400">{{ msg('name') }}</p>
        </div>

        <!-- Email -->
        <div>
          <label for="reg-email" class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">
            {{ t('auth.email') }}
          </label>
          <input
            id="reg-email"
            v-model="email"
            type="email"
            autocomplete="email"
            inputmode="email"
            class="mw-input"
            :class="inputRing('email')"
            placeholder="tu@email.com"
            @blur="touch('email')"
          />
          <p v-if="msg('email')" class="mt-1 text-xs text-red-400">{{ msg('email') }}</p>
        </div>

        <!-- Contraseña -->
        <div>
          <label for="reg-password" class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">
            {{ t('auth.password') }}
          </label>
          <div class="relative">
            <input
              id="reg-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              class="mw-input pr-11"
              :class="inputRing('password')"
              placeholder="Crea una contraseña segura"
              @blur="touch('password')"
            />
            <PasswordRevealToggle v-model="showPassword" />
          </div>

          <ul class="mt-3 space-y-1.5 text-[11px] dark:text-dark-txt2 text-light-txt2" aria-live="polite">
            <li class="flex items-center gap-2">
              <span :class="ruleIcon(ruleMin)">{{ ruleMin ? '✓' : '○' }}</span>
              Al menos 8 caracteres
            </li>
            <li class="flex items-center gap-2">
              <span :class="ruleIcon(ruleUpper)">{{ ruleUpper ? '✓' : '○' }}</span>
              Una letra mayúscula (A–Z)
            </li>
            <li class="flex items-center gap-2">
              <span :class="ruleIcon(ruleDigit)">{{ ruleDigit ? '✓' : '○' }}</span>
              Un número (0–9)
            </li>
          </ul>
          <p v-if="msg('password')" class="mt-1 text-xs text-red-400">{{ msg('password') }}</p>
        </div>

        <!-- Repetir contraseña -->
        <div>
          <label for="reg-password2" class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">
            Repetir contraseña
          </label>
          <div class="relative">
            <input
              id="reg-password2"
              v-model="passwordConfirm"
              :type="showPasswordConfirm ? 'text' : 'password'"
              autocomplete="new-password"
              class="mw-input pr-11"
              :class="inputRing('passwordConfirm')"
              placeholder="Vuelve a escribir la contraseña"
              @blur="touch('passwordConfirm')"
            />
            <PasswordRevealToggle v-model="showPasswordConfirm" />
          </div>
          <div
            v-if="passwordMismatchNotice"
            role="alert"
            aria-live="polite"
            class="mt-2 flex items-center gap-2 rounded-xl border border-red-400/35 bg-red-400/10 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400"
          >
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-400/20 text-xs font-black" aria-hidden="true">!</span>
            {{ t('validation.passwordMismatch') }}
          </div>
          <p
            v-else-if="msg('passwordConfirm')"
            class="mt-1 text-xs text-red-400"
          >
            {{ msg('passwordConfirm') }}
          </p>
        </div>

        <p v-if="localError" class="text-xs text-red-400 rounded-xl px-3 py-2 dark:bg-red-400/10 bg-red-400/10 border border-red-400/20">
          {{ localError }}
        </p>

        <button type="submit" class="btn-primary w-full" :disabled="submitting">
          {{ submitting ? t('auth.creatingAccount') : t('auth.register') }}
        </button>
        <p v-if="submitted && !canSubmit" class="text-[11px] text-center dark:text-dark-txt3 text-light-txt3">
          Corrige los errores del formulario para continuar.
        </p>
      </form>

      <p class="text-center text-sm mt-6 dark:text-dark-txt2 text-light-txt2">
        {{ t('auth.haveAccount') }}
        <RouterLink to="/login" class="text-brand-blue font-semibold underline underline-offset-2">{{ t('auth.signIn') }}</RouterLink>
      </p>
      <p class="text-center text-sm mt-2">
        <RouterLink to="/" class="dark:text-dark-txt3 text-light-txt3 underline underline-offset-2">{{ t('auth.backHome') }}</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { useWalletStore } from '@/stores/wallet'
import MwLogo from '@/components/MwLogo.vue'
import PasswordRevealToggle from '@/components/PasswordRevealToggle.vue'

type FieldKey = 'name' | 'email' | 'password' | 'passwordConfirm'

const router = useRouter()
const store = useWalletStore()
const { t } = useI18n()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const localError = ref<string | null>(null)
const submitting = ref(false)

const touched = ref<Partial<Record<FieldKey, boolean>>>({})
const submitted = ref(false)

const showPassword = ref(false)
const showPasswordConfirm = ref(false)

const ruleMin = computed(() => password.value.length >= 8)
const ruleUpper = computed(() => /[A-Z]/.test(password.value))
const ruleDigit = computed(() => /[0-9]/.test(password.value))
const passwordOk = computed(() => ruleMin.value && ruleUpper.value && ruleDigit.value)

const emailOk = computed(() => {
  const e = email.value.trim()
  if (!e) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
})

const nameOk = computed(() => {
  const n = name.value.trim()
  return n.length >= 2 && n.length <= 100
})

const passwordsMatch = computed(
  () => password.value.length > 0 && password.value === passwordConfirm.value
)

/** Aviso en vivo: ambas rellenas y distintas */
const passwordMismatchNotice = computed(
  () =>
    password.value.length > 0 &&
    passwordConfirm.value.length > 0 &&
    password.value !== passwordConfirm.value
)

const canSubmit = computed(
  () => nameOk.value && emailOk.value && passwordOk.value && passwordsMatch.value
)

function touch(key: FieldKey): void {
  touched.value = { ...touched.value, [key]: true }
}

function shouldShowField(key: FieldKey): boolean {
  return Boolean(touched.value[key] || submitted.value)
}

function inputRing(key: FieldKey): string {
  if (key === 'passwordConfirm' && passwordMismatchNotice.value) {
    return 'ring-1 ring-red-400/60 border-red-400/40'
  }
  if (!shouldShowField(key)) return ''
  return msg(key) ? 'ring-1 ring-red-400/60 border-red-400/40' : ''
}

function ruleIcon(ok: boolean): string {
  return ok ? 'text-brand-green font-semibold' : 'opacity-60'
}

function validateName(): string | null {
  const n = name.value.trim()
  if (n.length < 2) return t('validation.nameMin')
  if (n.length > 100) return t('validation.nameMax')
  return null
}

function validateEmail(): string | null {
  const e = email.value.trim()
  if (!e) return t('validation.emailRequired')
  if (!emailOk.value) return t('validation.emailInvalid')
  return null
}

function validatePasswordField(): string | null {
  if (!passwordOk.value) return t('validation.passwordRules')
  return null
}

function validatePasswordConfirm(): string | null {
  if (!passwordConfirm.value) return t('validation.passwordConfirmRequired')
  if (!passwordsMatch.value) return t('validation.passwordMismatch')
  return null
}

function msg(key: FieldKey): string | null {
  if (!shouldShowField(key)) return null
  switch (key) {
    case 'name':
      return validateName()
    case 'email':
      return validateEmail()
    case 'password':
      return validatePasswordField()
    case 'passwordConfirm':
      return validatePasswordConfirm()
    default:
      return null
  }
}

onMounted(() => {
  if (localStorage.getItem('token')) {
    router.replace({ name: 'home' })
  }
})

async function onSubmit(): Promise<void> {
  localError.value = null
  submitted.value = true
  ;(['name', 'email', 'password', 'passwordConfirm'] as const).forEach((k) => {
    touched.value = { ...touched.value, [k]: true }
  })

  if (!canSubmit.value) return

  submitting.value = true
  try {
    const data = await api.register({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value
    })
    store.applyAuth(data)
    await router.replace({ name: 'home' })
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: { message?: string } } } }
    localError.value = ax.response?.data?.error?.message ?? t('validation.registerFailed')
  } finally {
    submitting.value = false
  }
}
</script>
