import { describe, it, expect } from 'vitest'
import { inferIngTransactionType } from '../../src/services/transaction-import.service'
import type { IngParsedRow } from '../../src/services/ing-xlsx.parser'

function row(partial: Partial<IngParsedRow>): IngParsedRow {
  return {
    date: '2026-04-01',
    signedAmount: -0.99,
    balanceAfter: null,
    description: '',
    notes: null,
    parentCategory: null,
    subCategory: null,
    categoryHint: '',
    ...partial,
  }
}

describe('inferIngTransactionType', () => {
  it('importe positivo → income', () => {
    expect(inferIngTransactionType(row({ signedAmount: 100 }), 100)).toBe('income')
  })

  it('importe negativo → expense (incluye ahorro/redondeo)', () => {
    expect(
      inferIngTransactionType(
        row({
          signedAmount: -12.5,
          parentCategory: 'Supermercados',
          subCategory: 'Alimentación',
          description: 'Compra',
        }),
        -12.5
      )
    ).toBe('expense')
    expect(
      inferIngTransactionType(
        row({
          signedAmount: -0.99,
          parentCategory: 'Ahorro',
          subCategory: 'Redondeo',
          description:
            'Traspaso emitido a ADRIEL GUIJARRO GOYEZ Tu ahorro crece otra vez con tu compra de 15 EUR y 1 cts',
        }),
        -0.99
      )
    ).toBe('expense')
  })
})
