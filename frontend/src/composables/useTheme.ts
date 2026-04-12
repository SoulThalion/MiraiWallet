import { watchEffect } from 'vue'
import { useWalletStore } from '@/stores/wallet'

export function useTheme() {
  const store = useWalletStore()

  // Watch darkMode and apply/remove 'dark' class from document
  watchEffect(() => {
    if (store.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  })

  return { toggleDark: store.toggleDark }
}
