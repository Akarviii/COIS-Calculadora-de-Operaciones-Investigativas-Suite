/**
 * Utilidades compartidas — Métodos heurísticos del Problema de Transporte
 * (Esquina Noroeste NWC, Costo Mínimo LCM, Aproximación de Vogel VAM).
 *
 * Validación de entradas, balanceo con líneas ficticias y construcción del
 * resultado con contrato común para los tres solvers (UI simétrica).
 */

export const EPS = 1e-9

/** Formatea cantidades: enteros sin decimales, fraccionarios redondeados a 6 cifras. */
export function formatQty(n) {
  const rounded = Math.round(n * 1e6) / 1e6
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

/** Formatea el costo total Z (evita artefactos de coma flotante). */
export function formatZ(n) {
  const rounded = Math.round(n * 1e9) / 1e9
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function toNumber(val, label) {
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) {
      throw new Error(`${label} debe ser un número finito.`)
    }
    return val
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val.trim())
    if (Number.isFinite(n)) return n
  }
  throw new Error(`${label} debe ser numérico (ej: 5, 2.5 o -3).`)
}

/**
 * Valida y normaliza la entrada del problema de transporte.
 * - Matriz de costos rectangular y numérica.
 * - Ofertas/demandas numéricas, no negativas y de longitud correcta.
 * - Balance automático: si ΣOferta ≠ ΣDemanda añade una línea ficticia con costo 0.
 *
 * @returns {{
 *   origRows: number, origCols: number, isBalanced: boolean,
 *   costs: number[][], supplies: number[], demands: number[],
 *   rows: number, cols: number,
 *   workingCosts: number[][], workingSupplies: number[], workingDemands: number[],
 *   rowLabels: string[], colLabels: string[],
 *   balanceNote: string|null
 * }}
 */
export function parseTransportInput(costs, supplies, demands, rawRowLabels = [], rawColLabels = []) {
  if (!Array.isArray(costs) || costs.length === 0 || !Array.isArray(costs[0]) || costs[0].length === 0) {
    throw new Error('La matriz de costos debe contener al menos una fila y una columna.')
  }

  const origRows = costs.length
  const origCols = costs[0].length

  const numericCosts = costs.map((row, i) => {
    if (!Array.isArray(row) || row.length !== origCols) {
      throw new Error(`La fila ${i + 1} de la matriz de costos no tiene ${origCols} columnas.`)
    }
    return row.map((v, j) => toNumber(v, `El costo de la celda (${i + 1}, ${j + 1})`))
  })

  if (!Array.isArray(supplies) || supplies.length !== origRows) {
    throw new Error(`Debes definir ${origRows} valores de oferta (uno por cada fila/origen).`)
  }
  if (!Array.isArray(demands) || demands.length !== origCols) {
    throw new Error(`Debes definir ${origCols} valores de demanda (uno por cada columna/destino).`)
  }

  const numericSupplies = supplies.map((v, i) => {
    const n = toNumber(v, `La oferta de la fila ${i + 1}`)
    if (n < 0) throw new Error(`La oferta de la fila ${i + 1} no puede ser negativa.`)
    return n
  })

  const numericDemands = demands.map((v, j) => {
    const n = toNumber(v, `La demanda de la columna ${j + 1}`)
    if (n < 0) throw new Error(`La demanda de la columna ${j + 1} no puede ser negativa.`)
    return n
  })

  const sumS = numericSupplies.reduce((a, b) => a + b, 0)
  const sumD = numericDemands.reduce((a, b) => a + b, 0)

  if (sumS <= EPS && sumD <= EPS) {
    throw new Error('La oferta total y la demanda total deben ser mayores que cero.')
  }

  const rowLabels = []
  for (let i = 0; i < origRows; i++) {
    const custom = rawRowLabels[i]
    rowLabels.push(custom && String(custom).trim() !== '' ? String(custom) : `Origen ${i + 1}`)
  }
  const colLabels = []
  for (let j = 0; j < origCols; j++) {
    const custom = rawColLabels[j]
    colLabels.push(custom && String(custom).trim() !== '' ? String(custom) : `Destino ${j + 1}`)
  }

  // Balanceo con línea ficticia de costo 0
  const isBalanced = Math.abs(sumS - sumD) <= EPS
  let workingCosts = numericCosts.map(r => [...r])
  let workingSupplies = [...numericSupplies]
  let workingDemands = [...numericDemands]
  let balanceNote = null

  if (!isBalanced) {
    if (sumS > sumD) {
      // Falta demanda → columna ficticia
      const diff = Math.round((sumS - sumD) * 1e6) / 1e6
      workingCosts = workingCosts.map(r => [...r, 0])
      workingDemands.push(diff)
      colLabels.push('Destino Ficticio (Ficticio)')
      balanceNote = `Oferta total (${formatQty(sumS)}) > Demanda total (${formatQty(sumD)}): se añade una columna ficticia con demanda ${formatQty(diff)} y costo 0.`
    } else {
      // Falta oferta → fila ficticia
      const diff = Math.round((sumD - sumS) * 1e6) / 1e6
      workingCosts.push(Array(origCols).fill(0))
      workingSupplies.push(diff)
      rowLabels.push('Origen Ficticio (Ficticio)')
      balanceNote = `Demanda total (${formatQty(sumD)}) > Oferta total (${formatQty(sumS)}): se añade una fila ficticia con oferta ${formatQty(diff)} y costo 0.`
    }
  }

  return {
    origRows,
    origCols,
    isBalanced,
    costs: numericCosts,
    supplies: numericSupplies,
    demands: numericDemands,
    rows: workingSupplies.length,
    cols: workingDemands.length,
    workingCosts,
    workingSupplies,
    workingDemands,
    rowLabels,
    colLabels,
    balanceNote
  }
}

/**
 * Construye el resultado común a los tres métodos heurísticos.
 *
 * @param ctx Salida de parseTransportInput
 * @param allocationMatrix Matriz rows × cols con las cantidades asignadas
 * @param steps Pasos didácticos del método
 * @param meta { method, methodLabel }
 */
export function buildTransportResult(ctx, allocationMatrix, steps, meta) {
  const { rows, cols, origRows, origCols, workingCosts, workingSupplies, workingDemands } = ctx

  const assignments = []
  const rowSums = Array(rows).fill(0)
  const colSums = Array(cols).fill(0)
  let totalZ = 0

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const amount = allocationMatrix[i][j]
      if (amount > EPS) {
        const cost = workingCosts[i][j]
        const subtotal = amount * cost
        totalZ += subtotal
        rowSums[i] += amount
        colSums[j] += amount
        assignments.push({
          rowIdx: i,
          colIdx: j,
          from: ctx.rowLabels[i],
          to: ctx.colLabels[j],
          amount,
          amountDisplay: formatQty(amount),
          cost,
          costDisplay: formatQty(cost),
          subtotal,
          subtotalDisplay: formatZ(subtotal),
          isDummy: i >= origRows || j >= origCols
        })
      }
    }
  }

  const basicCells = assignments.length
  const requiredBasic = rows + cols - 1
  const isDegenerate = basicCells < requiredBasic

  let summary = `${meta.methodLabel}: ${basicCells} celda(s) asignada(s) con costo total Z = ${formatZ(totalZ)}.`
  if (!ctx.isBalanced && ctx.balanceNote) {
    summary += ` ${ctx.balanceNote}`
  }
  if (isDegenerate) {
    summary += ` Nota: solución degenerada (${basicCells} < ${requiredBasic} celdas básicas); para aplicar MODI/u-v deberían completarse celdas básicas en cero.`
  }

  return {
    method: meta.method,
    methodLabel: meta.methodLabel,
    isBalanced: ctx.isBalanced,
    balanceNote: ctx.balanceNote,
    origRows: ctx.origRows,
    origCols: ctx.origCols,
    rows,
    cols,
    rowLabels: ctx.rowLabels,
    colLabels: ctx.colLabels,
    costs: ctx.costs,
    supplies: ctx.supplies,
    demands: ctx.demands,
    workingSupplies,
    workingDemands,
    workingCosts,
    allocationMatrix,
    assignments,
    rowSums: rowSums.map(formatQty),
    colSums: colSums.map(formatQty),
    totalZ,
    totalZDisplay: formatZ(totalZ),
    basicCells,
    requiredBasic,
    isDegenerate,
    steps,
    summary
  }
}
