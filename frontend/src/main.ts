import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/main.css'

import HomeView from './views/HomeView.vue'
import StatsView from './views/StatsView.vue'
import AlertsView from './views/AlertsView.vue'
import AddView from './views/AddView.vue'
import SettingsView from './views/SettingsView.vue'
import OnboardingView from './views/OnboardingView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'onboarding', component: OnboardingView },
    { path: '/home', name: 'home', component: HomeView },
    { path: '/stats', name: 'stats', component: StatsView },
    { path: '/alerts', name: 'alerts', component: AlertsView },
    { path: '/add', name: 'add', component: AddView },
    { path: '/settings', name: 'settings', component: SettingsView },
  ]
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
