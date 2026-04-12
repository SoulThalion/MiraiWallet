import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AlertCard from '@/components/AlertCard.vue'
import { createPinia, setActivePinia } from 'pinia'

// Mock the composables
vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    isDark: { value: true }
  })
}))

describe('AlertCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders danger alert correctly', () => {
    const alert = {
      id: 1,
      type: 'danger' as const,
      badge: 'URGENTE',
      title: 'Test Alert',
      body: 'This is a test alert',
      amount: '€100',
      actions: [{ label: 'Pagar', style: 'primary' as const }]
    }

    const wrapper = mount(AlertCard, {
      props: { alert }
    })

    expect(wrapper.text()).toContain('Test Alert')
    expect(wrapper.text()).toContain('This is a test alert')
    expect(wrapper.text()).toContain('URGENTE')
  })

  it('emits dismiss event when secondary action clicked', async () => {
    const alert = {
      id: 1,
      type: 'danger' as const,
      badge: 'URGENTE',
      title: 'Test Alert',
      body: 'This is a test alert',
      amount: '€100',
      actions: [{ label: 'Dismiss', style: 'secondary' as const }]
    }

    const wrapper = mount(AlertCard, {
      props: { alert }
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('dismiss')).toBeTruthy()
    expect(wrapper.emitted('dismiss')![0]).toEqual([1])
  })
})
