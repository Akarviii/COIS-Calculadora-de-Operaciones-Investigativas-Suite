/**
 * Método del Costo Mínimo (LCM — Least Cost Method)
 *
 * Heurística de asignación inicial del Problema de Transporte:
 * selecciona en cada iteración la celda activa con el costo unitario
 * cᵢⱼ más bajo de toda la matriz, asigna x_ij = min(Sᵢ, Dⱼ),
 * elimina la fila o columna agotada y repite sobre la submatriz restante.
 */

import { EPS, parseTransportInput, buildTransportResult, formatQty } from './transportCommon.js'

export function solveLeastCost(costs, supplies, demands, rowLabels = [], colLabels = []) {
  const ctx = parseTransportInput(costs, supplies, demands, rowLabels, colLabels)

  const { rows, cols, workingCosts, workingSupplies, workingDemands } = ctx
  const remS = [...workingSupplies]
  const remD = [...workingDemands]
  const allocation = Array.from({ length: rows }, () => Array(cols).fill(0))
  const steps = []

  let stepNum = 0
  const maxSteps = rows * cols + 5

  while (stepNum < maxSteps) {
    // Buscar la celda activa de menor costo (desempate: primer índice, fila-major)
    let bi = -1
    let bj = -1
    let minCost = Infinity
    for (let i = 0; i < rows; i++) {
      if (remS[i] <= EPS) continue
      for (let j = 0; j < cols; j++) {
        if (remD[j] <= EPS) continue
        if (workingCosts[i][j] < minCost - EPS) {
          minCost = workingCosts[i][j]
          bi = i
          bj = j
        }
      }
    }
    if (bi === -1) break // Sin celdas activas: problema resuelto

    stepNum++
    const amount = Math.min(remS[bi], remD[bj])
    allocation[bi][bj] = amount
    remS[bi] = Math.max(0, remS[bi] - amount)
    remD[bj] = Math.max(0, remD[bj] - amount)

    const sOut = remS[bi] <= EPS
    const dOut = remD[bj] <= EPS
    const elimText = sOut && dOut
      ? 'Se eliminan la fila y la columna agotadas.'
      : sOut
        ? `Se elimina la fila de ${ctx.rowLabels[bi]} (oferta agotada).`
        : `Se elimina la columna de ${ctx.colLabels[bj]} (demanda satisfecha).`

    steps.push({
      step: stepNum,
      title: `Paso ${stepNum}: Menor costo global cᵢⱼ = ${formatQty(minCost)} en (${ctx.rowLabels[bi]}, ${ctx.colLabels[bj]})`,
      detail:
        `Se evalúan todas las celdas activas y el mínimo es ${formatQty(minCost)}. ` +
        `Asignación: x = min(${formatQty(workingSupplies[bi])}, ${formatQty(workingDemands[bj])}) = ${formatQty(amount)} unidades. ` +
        `${elimText} Remanentes → S: [${remS.map(formatQty).join(', ')}] · D: [${remD.map(formatQty).join(', ')}].`,
      cell: [bi, bj],
      amount,
      minCost,
      from: ctx.rowLabels[bi],
      to: ctx.colLabels[bj],
      remainingSupplies: remS.map(formatQty),
      remainingDemands: remD.map(formatQty)
    })
  }

  return buildTransportResult(ctx, allocation, steps, {
    method: 'LCM',
    methodLabel: 'Costo Mínimo (LCM)'
  })
}
