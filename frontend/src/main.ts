import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import App from './App.vue'
import './assets/main.css'
import i18n from '@/i18n'

import HomeView from './views/HomeView.vue'
import StatsView from './views/StatsView.vue'
import AlertsView from './views/AlertsView.vue'
import AddView from './views/AddView.vue'
import BudgetsView from './views/BudgetsView.vue'
import SettingsView from './views/SettingsView.vue'
import OnboardingView from './views/OnboardingView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import ImportView from './views/ImportView.vue'
import MovementsView from './views/MovementsView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'onboarding', component: OnboardingView, meta: { bare: true } },
  { path: '/login', name: 'login', component: LoginView, meta: { bare: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { bare: true } },
  { path: '/home', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/movements', name: 'movements', component: MovementsView, meta: { requiresAuth: true, fullHeight: true } },
  { path: '/stats', name: 'stats', component: StatsView, meta: { requiresAuth: true } },
  { path: '/alerts', name: 'alerts', component: AlertsView, meta: { requiresAuth: true } },
  { path: '/add', name: 'add', component: AddView, meta: { requiresAuth: true } },
  { path: '/budgets', name: 'budgets', component: BudgetsView, meta: { requiresAuth: true } },
  { path: '/settings', name: 'settings', component: SettingsView, meta: { requiresAuth: true } },
  { path: '/import', name: 'import', component: ImportView, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  if (to.name === 'onboarding' && token) {
    return { name: 'home' }
  }
  if (to.meta.requiresAuth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if ((to.name === 'login' || to.name === 'register') && token) {
    return { name: 'home' }
  }
  return true
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')
