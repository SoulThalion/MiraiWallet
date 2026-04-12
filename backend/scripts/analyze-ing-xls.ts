/**
 * Uso: npx tsx scripts/analyze-ing-xls.ts <ruta.xls>
 */
import fs from 'fs'
import * as XLSX from 'xlsx'
import { parseIngMovimientosSheet, classifyIngHeaderCell } from '../src/services/ing-xlsx.parser'
import { statementSnapshotFromIngRows } from '../src/services/transaction-import.service'

const path = process.argv[2]
if (!path) {
  console.error('Falta ruta al .xls')
  process.exit(1)
}

const buf = fs.readFileSync(path)
const workbook = XLSX.read(buf, { type: 'buffer', cellDates: false })
const name = workbook.SheetNames[0]!
const sheet = workbook.Sheets[name]
const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as unknown[][]

console.log('Hoja:', name, 'filas raw:', rawRows.length)

// Buscar fila cabecera y listar columnas con su clasificación
let headerRowIdx = -1
for (let r = 0; r < Math.min(80, rawRows.length); r++) {
  const row = rawRows[r] ?? []
  const cells = row.map((c) => String(c ?? '').trim())
  const hasFv = cells.some((c) => /^f\.?\s*valor/i.test(c) || c.toLowerCase() === 'f valor')
  const hasImp = cells.some((c) => /importe/i.test(c) && !/saldo/i.test(c))
  const hasDesc = cells.some((c) => /descripcion/i.test(c))
  if (hasFv && hasImp && hasDesc) {
    headerRowIdx = r
    console.log('\n--- Fila cabecera índice', r, '---')
    row.forEach((cell, i) => {
      const kind = classifyIngHeaderCell(cell)
      const label = String(cell ?? '').slice(0, 60)
      if (label) console.log(`  col ${i}: ${JSON.stringify(label)} -> ${kind ?? '(null)'}`)
    })
    break
  }
}

const parsed = parseIngMovimientosSheet(buf)
let income = 0
let expenses = 0
let pos = 0
let neg = 0
for (const r of parsed) {
  const a = r.signedAmount
  if (a > 0) {
    income += a
    pos++
  } else {
    expenses += Math.abs(a)
    neg++
  }
}
const net = income - expenses
console.log('\n--- Parser (misma lógica que import) ---')
console.log('Movimientos:', parsed.length, '(positivos:', pos, ', negativos:', neg, ')')
console.log('Suma ingresos (importe>0):', income.toFixed(2))
console.log('Suma gastos (importe<0):', expenses.toFixed(2))
console.log('Neto (ing - gast):', net.toFixed(2))

const snap = statementSnapshotFromIngRows(parsed)
if (snap.openingSaldo != null && snap.closingSaldo != null) {
  const delta = snap.closingSaldo - snap.openingSaldo
  console.log('\n--- Extracto (orden ING: fila0=reciente) ---')
  console.log('Periodo fechas:', snap.firstDate, '→', snap.lastDate)
  console.log('Saldo antes del movimiento más antiguo:', snap.openingSaldo.toFixed(2))
  console.log('Saldo tras el movimiento más reciente:', snap.closingSaldo.toFixed(2))
  console.log('Variación (cierre − apertura):', delta.toFixed(2))
  console.log('¿Neto movimientos ≈ variación?', Math.abs(net - delta) < 0.05)
}
