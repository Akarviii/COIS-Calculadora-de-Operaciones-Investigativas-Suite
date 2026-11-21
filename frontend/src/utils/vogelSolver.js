/**
 * Método de Aproximación de Vogel (VAM — Vogel's Approximation Method)
 *
 * Heurística de asignación inicial del Problema de Transporte:
 * en cada iteración calcula la penalización de cada renglón y columna
 * (diferencia entre los dos costos más bajos activos |c₁ - c₂|),
 * elige la línea de mayor penalización y asigna x_ij = min(Sᵢ, Dⱼ)
 * en la celda más barata de esa línea. Empates: primer índice (filas antes que columnas).
 */

import { EPS, parseTransportInput, buildTransportResult, formatQty } from './transportCommon.js'

/** Penalización de una línea: diferencia entre los dos menores costos activos. */
function linePenalty(values) {
  if (values.length < 2) return 0 // Final del algoritmo: línea forzada, sin costo de oportunidad
  let first = Infinity
  let second = Infinity
  for (const v of values) {
    if (v < first - EPS) {
      second = first
      first = v
    } else if (v < second - EPS) {
      second = v
    }
  }
  return second - first
}

export function solveVogel(costs, supplies, demands, rowLabels = [], colLabels = []) {
  const ctx = parseTransportInput(costs, supplies, demands, rowLabels, colLabels)

  const { rows, cols, workingCosts, workingSupplies, workingDemands } = ctx
  const remS = [...workingSupplies]
  const remD = [...workingDemands]
  const allocation = Array.from({ length: rows }, () => Array(cols).fill(0))
  const steps = []

  let stepNum = 0
  const maxSteps = rows * cols + 5

  while (stepNum < maxSteps) {
    const activeRows = []
    for (let i = 0; i < rows; i++) if (remS[i] > EPS) activeRows.push(i)
    const activeCols = []
    for (let j = 0; j < cols; j++) if (remD[j] > EPS) activeCols.push(j)
    if (activeRows.length === 0 || activeCols.length === 0) break

    // Penalizaciones por fila y columna
    const rowPenalties = Array(rows).fill(null)
    const colPenalties = Array(cols).fill(null)
    for (const i of activeRows) {
      const vals = activeCols.map(j => workingCosts[i][j])
      rowPenalties[i] = linePenalty(vals)
    }
    for (const j of activeCols) {
      const vals = activeRows.map(i => workingCosts[i][j])
      colPenalties[j] = linePenalty(vals)
    }

    // Máxima penalización (empate → primera fila, luego primera columna)
    let chosenType = null
    let chosenIndex = -1
    let maxPen = -Infinity
    for (const i of activeRows) {
      if (rowPenalties[i] > maxPen + EPS) {
        maxPen = rowPenalties[i]
        chosenType = 'row'
        chosenIndex = i
      }
    }
    for (const j of activeCols) {
      if (colPenalties[j] > maxPen + EPS) {
        maxPen = colPenalties[j]
        chosenType = 'col'
        chosenIndex = j
      }
    }
    if (chosenType === null) break

    // Celda más barata de la línea elegida (desempate: primer índice)
    let bi = -1
    let bj = -1
    let minCost = Infinity
    if (chosenType === 'row') {
      const i = chosenIndex
      for (const j of activeCols) {
        if (workingCosts[i][j] < minCost - EPS) {
          minCost = workingCosts[i][j]
          bi = i
          bj = j
        }
      }
    } else {
      const j = chosenIndex
      for (const i of activeRows) {
        if (workingCosts[i][j] < minCost - EPS) {
          minCost = workingCosts[i][j]
          bi = i
          bj = j
        }
      }
    }
    if (bi === -1) break

    stepNum++
    const amount = Math.min(remS[bi], remD[bj])
    allocation[bi][bj] = amount
    remS[bi] = Math.max(0, remS[bi] - amount)
    remD[bj] = Math.max(0, remD[bj] - amount)

    const lineLabel = chosenType === 'row' ? ctx.rowLabels[chosenIndex] : ctx.colLabels[chosenIndex]
    const lineName = chosenType === 'row' ? 'fila' : 'columna'
    const sOut = remS[bi] <= EPS
    const dOut = remD[bj] <= EPS
    const elimText = sOut && dOut
      ? 'Se eliminan la fila y la columna agotadas.'
      : sOut
        ? `Se elimina la fila de ${ctx.rowLabels[bi]} (oferta agotada).`
        : `Se elimina la columna de ${ctx.colLabels[bj]} (demanda satisfecha).`

    steps.push({
      step: stepNum,
      title: `Iteración ${stepNum}: máxima penalización = ${formatQty(maxPen)} en la ${lineName} "${lineLabel}"`,
      detail:
        `Penalizaciones → Filas: [${rowPenalties.map(p => (p === null ? '—' : formatQty(p))).join(', ')}] · ` +
        `Columnas: [${colPenalties.map(p => (p === null ? '—' : formatQty(p))).join(', ')}]. ` +
        `Se elige la ${lineName} "${lineLabel}" y en ella la celda más barata (${ctx.rowLabels[bi]}, ${ctx.colLabels[bj]}) = ${formatQty(minCost)}. ` +
        `Asignación: x = min(${formatQty(workingSupplies[bi])}, ${formatQty(workingDemands[bj])}) = ${formatQty(amount)} unidades. ` +
        `${elimText}`,
      cell: [bi, bj],
      amount,
      minCost,
      maxPenalty: maxPen,
      chosenType,
      chosenIndex,
      rowPenalties,
      colPenalties,
      from: ctx.rowLabels[bi],
      to: ctx.colLabels[bj],
      remainingSupplies: remS.map(formatQty),
      remainingDemands: remD.map(formatQty)
    })
  }

  return buildTransportResult(ctx, allocation, steps, {
    method: 'VAM',
    methodLabel: 'Aproximación de Vogel (VAM)'
  })
}
