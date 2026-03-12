import type { AppContext } from '../types'
import { buildRadarChart } from '../ui/radar-chart'
import { buildSoilChart } from '../ui/soil-chart'

export type ChartOps = {
  updateRadar: () => void
  updateSoil: () => void
}

export function initCharts(ctx: AppContext): ChartOps {
  // Soil chart
  const soilChart = buildSoilChart()
  ctx.elements.soilChartSection.appendChild(soilChart.container)

  // Radar chart — SVG overlay on the tree canvas
  const radarChart = buildRadarChart()
  ctx.elements.canvas.appendChild(radarChart.svg)
  ctx.radarTick = radarChart.tick

  return {
    updateRadar: () => radarChart.update(),
    updateSoil: () => soilChart.update(),
  }
}
