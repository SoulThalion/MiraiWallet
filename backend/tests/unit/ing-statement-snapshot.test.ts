import { describe, it, expect } from 'vitest'
import { statementSnapshotFromIngRows } from '../../src/services/transaction-import.service'
import type { IngParsedRow } from '../../src/services/ing-xlsx.parser'

describe('statementSnapshotFromIngRows (orden ING: reciente primero)', () => {
  it('apertura = saldo más antiguo − importe; cierre = saldo fila más reciente', () => {
    const rows: IngParsedRow[] = [
      {
        date: '2026-03-16',
        signedAmount: -0.31,
        balanceAfter: 548.16,
        description: 'r',
        notes: null,
        parentCategory: null,
        subCategory: null,
        categoryHint: '',
      },
      {
        date: '2025-12-18',
        signedAmount: -6.59,
        balanceAfter: 257.64,
        description: 'old',
        notes: null,
        parentCategory: null,
        subCategory: null,
        categoryHint: '',
      },
    ]
    const s = statementSnapshotFromIngRows(rows)
    expect(s.openingSaldo).toBeCloseTo(264.23)
    expect(s.closingSaldo).toBeCloseTo(548.16)
    expect(s.firstDate).toBe('2025-12-18')
    expect(s.lastDate).toBe('2026-03-16')
  })
})
