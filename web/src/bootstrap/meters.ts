import type { AppElements } from '../types'
import { getSoilAvailable, getSoilCapacity, getWaterAvailable } from '../state'

// Soil meter update function
export function updateSoilMeter(elements: AppElements): void {
  const available = getSoilAvailable()
  const capacity = getSoilCapacity()
  const pct = capacity > 0 ? (available / capacity) * 100 : 0
  elements.soilMeterFill.style.width = `${pct}%`
  elements.soilMeterValue.textContent = `${available.toFixed(2)}/${capacity.toFixed(2)}`
}

// Water meter update function - toggle circle fill states
export function updateWaterMeter(elements: AppElements): void {
  const available = getWaterAvailable()
  elements.waterCircles.forEach((circle: HTMLElement, i: number) => {
    circle.classList.toggle('is-filled', i < available)
  })
}

// Celebration animation — brief pulse on meter after action
export function celebrateMeter(meter: HTMLElement): void {
  meter.classList.remove('is-celebrating')
  void meter.offsetWidth
  meter.classList.add('is-celebrating')
  meter.addEventListener(
    'animationend',
    () => {
      meter.classList.remove('is-celebrating')
    },
    { once: true },
  )
}
