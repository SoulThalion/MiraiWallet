import { describe, it, expect, beforeEach } from 'vitest'
import { mount }                            from '@vue/test-utils'
import { setActivePinia, createPinia }      from 'pinia'
import AlertCard                            from '@/components/AlertCard.vue'

const mockAlert = {
  id: 1,
  type: 'danger',
  badge: 'URGENTE',
  title: 'Seguro del coche vence en 3 días',
  body: 'Tienes saldo suficiente para pagarlo.',
  amount: '€420,00',
  actions: [
    { label: 'Pagar ahora', style: 'primary' },
    { label: 'Recordar',    style: 'secondary' },
  ]
}

describe('AlertCard.vue', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders the alert title', () => {
    const wrapper = mount(AlertCard, { props: { alert: mockAlert } })
    expect(wrapper.text()).toContain('Seguro del coche vence en 3 días')
  })

  it('renders the body text', () => {
    const wrapper = mount(AlertCard, { props: { alert: mockAlert } })
    expect(wrapper.text()).toContain('Tienes saldo suficiente')
  })

  it('renders the amount', () => {
    const wrapper = mount(AlertCard, { props: { alert: mockAlert } })
    expect(wrapper.text()).toContain('€420,00')
  })

  it('renders the badge', () => {
    const wrapper = mount(AlertCard, { props: { alert: mockAlert } })
    expect(wrapper.text()).toContain('URGENTE')
  })

  it('renders all action buttons', () => {
    const wrapper = mount(AlertCard, { props: { alert: mockAlert } })
    expect(wrapper.text()).toContain('Pagar ahora')
    expect(wrapper.text()).toContain('Recordar')
  })

  it('emits dismiss when secondary button is clicked', async () => {
    const wrapper = mount(AlertCard, { props: { alert: mockAlert } })
    const buttons = wrapper.findAll('button')
    const secondary = buttons.find(b => b.text() === 'Recordar')
    await secondary.trigger('click')
    expect(wrapper.emitted('dismiss')).toBeTruthy()
    expect(wrapper.emitted('dismiss')[0]).toEqual([1])
  })

  it('emits action when primary button is clicked', async () => {
    const wrapper = mount(AlertCard, { props: { alert: mockAlert } })
    const buttons = wrapper.findAll('button')
    const primary = buttons.find(b => b.text() === 'Pagar ahora')
    await primary.trigger('click')
    expect(wrapper.emitted('action')).toBeTruthy()
    expect(wrapper.emitted('action')[0][0]).toMatchObject({ alertId: 1, action: 'Pagar ahora' })
  })

  it('applies danger border class for type=danger', () => {
    const wrapper = mount(AlertCard, { props: { alert: mockAlert } })
    expect(wrapper.html()).toContain('border-red')
  })

  it('applies success border class for type=success', () => {
    const successAlert = { ...mockAlert, type: 'success', badge: 'TIP' }
    const wrapper = mount(AlertCard, { props: { alert: successAlert } })
    expect(wrapper.html()).toContain('green')
  })
})
