import { describe, it, expect } from 'vitest'
import { ingImportDuplicateKey } from '../../src/services/transaction-import.service'

describe('ingImportDuplicateKey', () => {
  it('misma clave para mismos datos', () => {
    const a = ingImportDuplicateKey('acc-1', '2026-03-16', 13.69, 'expense', 'Pago en FRUTERIA')
    const b = ingImportDuplicateKey('acc-1', '2026-03-16', 13.69, 'expense', 'Pago en FRUTERIA')
    expect(a).toBe(b)
  })

  it('expense y transfer comparten sentido «out»', () => {
    const e = ingImportDuplicateKey('acc-1', '2026-03-16', 0.31, 'expense', 'Redondeo')
    const t = ingImportDuplicateKey('acc-1', '2026-03-16', 0.31, 'transfer', 'Redondeo')
    expect(e).toBe(t)
  })

  it('normaliza espacios en descripción', () => {
    const a = ingImportDuplicateKey('acc-1', '2026-03-16', 1, 'income', 'Bizum  recibido')
    const b = ingImportDuplicateKey('acc-1', '2026-03-16', 1, 'income', 'Bizum recibido')
    expect(a).toBe(b)
  })

  it('distingue importe', () => {
    const a = ingImportDuplicateKey('acc-1', '2026-03-16', 10, 'expense', 'X')
    const b = ingImportDuplicateKey('acc-1', '2026-03-16', 10.01, 'expense', 'X')
    expect(a).not.toBe(b)
  })
})
