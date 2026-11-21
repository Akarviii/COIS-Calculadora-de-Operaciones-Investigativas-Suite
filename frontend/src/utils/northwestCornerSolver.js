/**
 * Método de la Esquina Noroeste (NWC — Northwest Corner Rule)
 *
 * Heurística de asignación inicial del Problema de Transporte:
 * inicia siempre en la celda superior izquierda activa, asigna
 * x_ij = min(Sᵢ, Dⱼ) y avanza hacia abajo (oferta agotada),
 * hacia la derecha (demanda satisfecha) o en diagonal (ambas).
 */

import { EPS, parseTransportInput, buildTransportResult, formatQty } from './transportCommon.js'

export function solveNorthwestCorner(costs, supplies, demands, rowLabels = [], colLabels = []) {
  const ctx = parseTransportInput(costs, supplies, demands, rowLabels, colLabels)

  const { rows, cols, workingSupplies, workingDemands } = ctx
  const remS = [...workingSupplies]
  const remD = [...workingDemands]
  const allocation = Array.from({ length: rows }, () => Array(cols).fill(0))
  const steps = []

  let i = 0
  let j = 0
  let stepNum = 0
  const maxSteps = rows * cols + 5

  while (i < rows && j < cols && stepNum < maxSteps) {
    if (remS[i] <= EPS) { i++; continue }
    if (remD[j] <= EPS) { j++; continue }

    stepNum++
    const amount = Math.min(remS[i], remD[j])
    allocation[i][j] = amount
    remS[i] = Math.max(0, remS[i] - amount)
    remD[j] = Math.max(0, remD[j] - amount)

    const sOut = remS[i] <= EPS
    const dOut = remD[j] <= EPS
    let moveText
    if (sOut && dOut) {
      moveText = 'Se agotan simultáneamente la oferta y la demanda: se eliminan la fila y la columna, avanzando en diagonal.'
    } else if (sOut) {
      moveText = `Se agota la oferta de ${ctx.rowLabels[i]}: se elimina la fila y se avanza hacia abajo.`
    } else {
      moveText = `Se satisface la demanda de ${ctx.colLabels[j]}: se elimina la columna y se avanza a la derecha.`
    }

    steps.push({
      step: stepNum,
      title: `Paso ${stepNum}: Asignación en (${ctx.rowLabels[i]}, ${ctx.colLabels[j]})`,
      detail:
        `x = min(${formatQty(workingSupplies[i])}, ${formatQty(workingDemands[j])}) = ${formatQty(amount)} unidades. ` +
        `${moveText} Remanentes → S: [${remS.map(formatQty).join(', ')}] · D: [${remD.map(formatQty).join(', ')}].`,
      cell: [i, j],
      amount,
      from: ctx.rowLabels[i],
      to: ctx.colLabels[j],
      remainingSupplies: remS.map(formatQty),
      remainingDemands: remD.map(formatQty)
    })

    if (sOut) i++
    if (dOut) j++
  }

  return buildTransportResult(ctx, allocation, steps, {
    method: 'NWC',
    methodLabel: 'Esquina Noroeste (NWC)'
  })
}
