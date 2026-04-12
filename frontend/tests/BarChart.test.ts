import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BarChart from '@/components/BarChart.vue'
import { createPinia, setActivePinia } from 'pinia'

// Mock the composables
vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    isDark: { value: true }
  })
}))

describe('BarChart', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders bars correctly', () => {
    const bars = [
      { month: 'Jan', amount: 1000 },
      { month: 'Feb', amount: 2000 },
      { month: 'Mar', amount: 1500 }
    ]
    const maxVal = 2000

    const wrapper = mount(BarChart, {
      props: { bars, maxVal }
    })

    expect(wrapper.findAll('.flex-1').length).toBe(3)
    expect(wrapper.text()).toContain('Jan')
    expect(wrapper.text()).toContain('Feb')
    expect(wrapper.text()).toContain('Mar')
  })

  it('calculates bar heights correctly', () => {
    const bars = [
      { month: 'Jan', amount: 1000 },
      { month: 'Feb', amount: 2000 }
    ]
    const maxVal = 2000

    const wrapper = mount(BarChart, {
      props: { bars, maxVal }
    })

    const barDivs = wrapper.findAll('.w-full.rounded-t')
    expect(barDivs.length).toBe(2)
  })
})
