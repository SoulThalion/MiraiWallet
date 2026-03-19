// composables/useTheme.js
import { computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'

export function useTheme() {
  const store = useWalletStore()

  const isDark = computed(() => store.darkMode)

  // Returns conditional Tailwind classes for text/bg based on theme
  const themeText     = computed(() => isDark.value ? 'text-dark-txt'  : 'text-light-txt')
  const themeText2    = computed(() => isDark.value ? 'text-dark-txt2' : 'text-light-txt2')
  const themeBg       = computed(() => isDark.value ? 'bg-dark-bg'     : 'bg-light-bg')
  const themeCard     = computed(() => isDark.value ? 'bg-dark-card'   : 'bg-light-card')
  const themeSurf     = computed(() => isDark.value ? 'bg-dark-surf'   : 'bg-light-surf')
  const themeBorder   = computed(() => isDark.value ? 'border-white/[0.07]' : 'border-brand-blue/10')
  const themeMode     = computed(() => isDark.value ? 'dark' : 'light')

  return { isDark, themeText, themeText2, themeBg, themeCard, themeSurf, themeBorder, themeMode }
}
