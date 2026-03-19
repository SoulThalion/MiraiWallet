import { describe, it, expect, beforeEach } from 'vitest'
import { mount }                            from '@vue/test-utils'
import { setActivePinia, createPinia }      from 'pinia'
import TransactionItem                      from '@/components/TransactionItem.vue'

const mockTx = {
  id: 1,
  name: 'Mercadona',
  category: 'Alimentación',
  icon: '🛒',
  amount: -87.40,
  date: 'Hoy, 10:23',
}

const positiveTx = {
  id: 2,
  name: 'Nómina',
  category: 'Ingresos',
  icon: '💰',
  amount: 3200,
  date: '14 Mar',
}

describe('TransactionItem.vue', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders the transaction name', () => {
    const wrapper = mount(TransactionItem, { props: { tx: mockTx } })
    expect(wrapper.text()).toContain('Mercadona')
  })

  it('renders the category', () => {
    const wrapper = mount(TransactionItem, { props: { tx: mockTx } })
    expect(wrapper.text()).toContain('Alimentación')
  })

  it('renders the icon', () => {
    const wrapper = mount(TransactionItem, { props: { tx: mockTx } })
    expect(wrapper.text()).toContain('🛒')
  })

  it('renders the date', () => {
    const wrapper = mount(TransactionItem, { props: { tx: mockTx } })
    expect(wrapper.text()).toContain('Hoy, 10:23')
  })

  it('shows negative sign for expense', () => {
    const wrapper = mount(TransactionItem, { props: { tx: mockTx } })
    expect(wrapper.text()).toContain('-€87,40')
  })

  it('shows positive sign for income', () => {
    const wrapper = mount(TransactionItem, { props: { tx: positiveTx } })
    expect(wrapper.text()).toContain('+€3.200,00')
  })

  it('applies red color class for negative amount', () => {
    const wrapper = mount(TransactionItem, { props: { tx: mockTx } })
    expect(wrapper.html()).toContain('red')
  })

  it('applies green color class for positive amount', () => {
    const wrapper = mount(TransactionItem, { props: { tx: positiveTx } })
    expect(wrapper.html()).toContain('green')
  })
})
