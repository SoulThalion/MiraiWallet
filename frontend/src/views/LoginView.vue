<template>
  <div class="min-h-screen flex items-center justify-center p-4 dark:bg-gradient-to-br dark:from-[#071426] dark:via-dark-bg dark:to-[#071E10] bg-gradient-to-br from-[#D8EAFB] via-light-bg to-[#EAF5EE]">
    <div class="w-full max-w-md mx-auto">
      <div class="text-center mb-8">
        <MwLogo size="md" class="mx-auto mb-4" />
        <p class="font-display font-black text-2xl dark:text-dark-txt text-light-txt">Iniciar sesión</p>
        <p class="text-sm mt-1 dark:text-dark-txt2 text-light-txt2">Accede con tu cuenta Mirai Wallet</p>
      </div>

      <div class="mw-card text-left space-y-4">
        <div>
          <label class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">Email</label>
          <input v-model="email" type="email" autocomplete="email" class="mw-input" placeholder="tu@email.com" />
        </div>
        <div>
          <label for="login-password" class="block text-xs uppercase tracking-wider mb-1.5 font-semibold dark:text-dark-txt2 text-light-txt2">Contraseña</label>
          <div class="relative">
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              class="mw-input pr-11"
              placeholder="••••••••"
            />
            <PasswordRevealToggle v-model="showPassword" />
          </div>
        </div>
        <p v-if="localError" class="text-xs text-red-400">{{ localError }}</p>
        <button class="btn-primary w-full" :disabled="submitting" @click="submit">
          {{ submitting ? 'Entrando…' : 'Entrar' }}
        </button>
      </div>

      <p class="text-center text-sm mt-6 dark:text-dark-txt2 text-light-txt2">
        ¿No tienes cuenta?
        <RouterLink to="/register" class="text-brand-blue font-semibold underline underline-offset-2">Crear cuenta</RouterLink>
      </p>
      <p class="text-center text-sm mt-2">
        <RouterLink to="/" class="dark:text-dark-txt3 text-light-txt3 underline underline-offset-2">Volver al inicio</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useWalletStore } from '@/stores/wallet'
import MwLogo from '@/components/MwLogo.vue'
import PasswordRevealToggle from '@/components/PasswordRevealToggle.vue'

const route = useRoute()
const router = useRouter()
const store = useWalletStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const localError = ref<string | null>(null)
const submitting = ref(false)

onMounted(() => {
  if (localStorage.getItem('token')) {
    router.replace({ name: 'home' })
  }
})

async function submit(): Promise<void> {
  localError.value = null
  if (!email.value.trim() || !password.value) {
    localError.value = 'Introduce email y contraseña.'
    return
  }
  submitting.value = true
  try {
    const data = await api.login(email.value.trim(), password.value)
    store.applyAuth(data)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/home'
    await router.replace(redirect || '/home')
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: { message?: string } } } }
    localError.value = ax.response?.data?.error?.message ?? 'No se pudo iniciar sesión.'
  } finally {
    submitting.value = false
  }
}
</script>
