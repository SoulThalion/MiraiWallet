import { describe, it, expect } from 'vitest'
import {
  parseEuropeanNumber,
  parseSpanishDate,
  classifyIngHeaderCell,
  splitCombinedIngCategoryPath,
} from '../../src/services/ing-xlsx.parser'

describe('ing-xlsx.parser', () => {
  it('classifyIngHeaderCell detecta columna Saldo', () => {
    expect(classifyIngHeaderCell('Saldo')).toBe('saldo')
    expect(classifyIngHeaderCell('SALDO CUENTA')).toBe('saldo')
  })

  it('classifyIngHeaderCell detecta subcategoría con guion o espacio', () => {
    expect(classifyIngHeaderCell('SUBCATEGORÍA')).toBe('subcategoria')
    expect(classifyIngHeaderCell('Sub-categoría')).toBe('subcategoria')
    expect(classifyIngHeaderCell('SUB CATEGORÍA')).toBe('subcategoria')
    expect(classifyIngHeaderCell('Subcategory')).toBe('subcategoria')
    expect(classifyIngHeaderCell('CATEGORÍA')).toBe('categoria')
    expect(classifyIngHeaderCell('Categoría')).toBe('categoria')
  })

  it('splitCombinedIngCategoryPath parte jerarquía en una celda', () => {
    expect(splitCombinedIngCategoryPath('Supermercados > Alimentación')).toEqual({
      parent: 'Supermercados',
      child: 'Alimentación',
    })
    expect(splitCombinedIngCategoryPath('Ocio / Restaurantes')).toEqual({
      parent: 'Ocio',
      child: 'Restaurantes',
    })
    expect(splitCombinedIngCategoryPath('Sólo una etiqueta')).toEqual({
      parent: 'Sólo una etiqueta',
      child: null,
    })
  })

  it('parseSpanishDate', () => {
    expect(parseSpanishDate('16/03/2026')).toBe('2026-03-16')
    expect(parseSpanishDate('1/1/2025')).toBe('2025-01-01')
    expect(parseSpanishDate('xx')).toBeNull()
  })

  it('parseEuropeanNumber', () => {
    expect(parseEuropeanNumber('-0,31')).toBeCloseTo(-0.31)
    expect(parseEuropeanNumber('548,16')).toBeCloseTo(548.16)
    expect(parseEuropeanNumber('-13,69')).toBeCloseTo(-13.69)
    expect(parseEuropeanNumber('1.234,56')).toBeCloseTo(1234.56)
    /** xlsx `raw:false` a veces devuelve miles estilo US en columna Saldo */
    expect(parseEuropeanNumber('1,146.77')).toBeCloseTo(1146.77)
    expect(parseEuropeanNumber('-50.00')).toBeCloseTo(-50)
  })
})
