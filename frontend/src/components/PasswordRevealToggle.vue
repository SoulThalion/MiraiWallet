<template>
  <button
    type="button"
    class="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg
           text-light-txt2 transition-colors
           hover:bg-brand-blue/10 hover:text-brand-blue
           dark:text-dark-txt2 dark:hover:bg-white/10 dark:hover:text-brand-blue
           focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50"
    :aria-label="revealed ? t('auth.hidePassword') : t('auth.showPassword')"
    :aria-pressed="revealed"
    @click="revealed = !revealed"
  >
    <!-- Contraseña visible → ojo (Tabler) -->
    <IconEye v-if="revealed" icon-class="h-5 w-5" />
    <!-- Contraseña oculta → ojo tachado (Tabler) -->
    <IconEyeOff v-else icon-class="h-5 w-5" />
  </button>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconEye from '@/icons/IconEye.vue'
import IconEyeOff from '@/icons/IconEyeOff.vue'

/** true = la contraseña se muestra en claro */
const revealed = defineModel<boolean>({ default: false })
const { t } = useI18n()
</script>
