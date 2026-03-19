import { describe, it, expect, beforeEach } from 'vitest'
import { mount }                            from '@vue/test-utils'
import { setActivePinia, createPinia }      from 'pinia'
import BarChart                             from '@/components/BarChart.vue'

const bars = [
  { month: 'Oct', amount: 1604 },
  { month: 'Nov', amount: 2100 },
  { month: 'Dic', amount: 2800, current: true },
  { month: 'Ene', amount: 1920 },
  { month: 'Feb', amount: 1703 },
  { month: 'Mar', amount: 1847 },
]

describe('BarChart.vue', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders all month labels', () => {
    const wrapper = mount(BarChart, { props: { bars, maxVal: 2800 } })
    bars.forEach(b => expect(wrapper.text()).toContain(b.month))
  })

  it('renders formatted values', () => {
    const wrapper = mount(BarChart, { props: { bars, maxVal: 2800 } })
    expect(wrapper.text()).toContain('1.6k')
    expect(wrapper.text()).toContain('2.8k')
  })

  it('applies brand-blue class to current bar label', () => {
    const wrapper = mount(BarChart, { props: { bars, maxVal: 2800 } })
    expect(wrapper.html()).toContain('text-brand-blue')
  })

  it('renders the correct number of bar columns', () => {
    const wrapper = mount(BarChart, { props: { bars, maxVal: 2800 } })
    const cols = wrapper.findAll('.flex-1.flex.flex-col')
    expect(cols.length).toBe(bars.length)
  })
})
