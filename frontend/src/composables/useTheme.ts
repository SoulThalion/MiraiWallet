import { watchEffect } from 'vue'
import { useWalletStore } from '@/stores/wallet'

export function useTheme() {
  const store = useWalletStore()

  // Sincroniza <html>: Tailwind `dark:` usa `.dark`; estilos en main.css usan `.light` / `.dark` en ancestro.
  watchEffect(() => {
    const root = document.documentElement
    if (store.darkMode) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }
  })

  return { toggleDark: store.toggleDark }
}
