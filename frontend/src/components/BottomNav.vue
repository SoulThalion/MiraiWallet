<template>
  <nav class="fixed bottom-0 left-0 right-0 h-[68px] flex items-center justify-around px-2 pb-2 z-20 border-t dark:bg-dark-card/95 dark:border-white/[0.07] bg-light-card border-brand-blue/10">
    <RouterLink v-for="item in navItemsLeft" :key="item.name" :to="item.to" custom v-slot="{ isActive, navigate }">
      <button :class="['nav-item', isActive ? 'active' : '']" @click="navigate">
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </RouterLink>

    <RouterLink to="/add" custom v-slot="{ navigate }">
      <button @click="navigate" class="w-12 h-12 rounded-[14px] bg-gradient-to-br from-brand-blue-dark to-brand-blue flex items-center justify-center text-white text-2xl flex-shrink-0 shadow-glow transition-transform active:scale-95">+</button>
    </RouterLink>

    <RouterLink v-for="item in navItemsRight" :key="item.name" :to="item.to" custom v-slot="{ isActive, navigate }">
      <button :class="['nav-item', isActive ? 'active' : '']" @click="navigate">
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
interface NavItem {
  name: string
  to: string
  icon: string
  label: string
}

const navItemsLeft: NavItem[] = [
  { name: 'home', to: '/home', icon: '🏠', label: 'Inicio' },
  { name: 'movements', to: '/movements', icon: '📋', label: 'Movs' },
]
const navItemsRight: NavItem[] = [
  { name: 'stats', to: '/stats', icon: '📊', label: 'Stats' },
  { name: 'alerts', to: '/alerts', icon: '🔔', label: 'Alertas' },
  { name: 'settings', to: '/settings', icon: '⚙️', label: 'Ajustes' },
]
</script>
