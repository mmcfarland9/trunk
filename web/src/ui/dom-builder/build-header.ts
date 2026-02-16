import { getSoilAvailable, getSoilCapacity, getWaterAvailable } from '../../state'
import trunkLogo from '../../../assets/tree_icon_transp.png'

export type HeaderElements = {
  header: HTMLElement
  profileBadge: HTMLDivElement
  profileEmail: HTMLSpanElement
  syncButton: HTMLButtonElement
  soilMeterFill: HTMLDivElement
  soilMeterValue: HTMLSpanElement
  waterCircles: HTMLSpanElement[]
  sunCircle: HTMLSpanElement
  waterMeter: HTMLDivElement
  sunMeter: HTMLDivElement
  soilMeter: HTMLDivElement
}

export function buildHeader(): HeaderElements {
  const header = document.createElement('header')
  header.className = 'app-header'

  const actions = document.createElement('div')
  actions.className = 'app-actions'

  const logo = document.createElement('img')
  logo.className = 'header-logo'
  logo.src = trunkLogo
  logo.alt = 'Trunk logo'

  // Profile badge (shown when authenticated)
  const profileBadge = document.createElement('div')
  profileBadge.className = 'profile-badge hidden'

  const profileIcon = document.createElement('span')
  profileIcon.className = 'profile-icon'
  profileIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 5v1h16v-1c0-2-2-5-8-5z"/></svg>'

  const profileEmail = document.createElement('span')
  profileEmail.className = 'profile-email'
  profileEmail.textContent = ''

  profileBadge.append(profileIcon, profileEmail)

  // Sync button (shown next to profile badge when authenticated)
  const syncButton = document.createElement('button')
  syncButton.type = 'button'
  syncButton.className = 'sync-button hidden'
  syncButton.setAttribute('aria-label', 'Sync data')
  syncButton.innerHTML = '<svg class="sync-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>'

  // Wrap badge + sync in a stretch group so sync button matches badge height
  const profileGroup = document.createElement('div')
  profileGroup.className = 'profile-group'
  profileGroup.append(profileBadge, syncButton)

  actions.append(profileGroup)

  // Global Soil meter
  const soilMeter = document.createElement('div')
  soilMeter.className = 'resource-meter soil-meter'

  const soilLabel = document.createElement('span')
  soilLabel.className = 'resource-meter-label'
  soilLabel.textContent = 'Soil:'

  const soilTrack = document.createElement('div')
  soilTrack.className = 'resource-meter-track'

  const soilFill = document.createElement('div')
  soilFill.className = 'resource-meter-fill'
  const initialAvailable = getSoilAvailable()
  const initialCapacity = getSoilCapacity()
  soilFill.style.width = `${(initialAvailable / initialCapacity) * 100}%`

  const soilValue = document.createElement('span')
  soilValue.className = 'resource-meter-value'
  soilValue.textContent = `${initialAvailable.toFixed(2)}/${initialCapacity.toFixed(2)}`

  soilTrack.append(soilFill)
  soilMeter.append(soilLabel, soilTrack, soilValue)

  // Global Water meter - 3 circles
  const waterMeter = document.createElement('div')
  waterMeter.className = 'resource-meter water-meter'

  const waterLabel = document.createElement('span')
  waterLabel.className = 'resource-meter-label'
  waterLabel.textContent = 'Water:'

  const waterTrack = document.createElement('div')
  waterTrack.className = 'resource-meter-track resource-circles'

  const initialWaterAvailable = getWaterAvailable()
  const waterCircles: HTMLSpanElement[] = []
  for (let i = 0; i < 3; i++) {
    const circle = document.createElement('span')
    circle.className = 'resource-circle water-circle'
    if (i < initialWaterAvailable) {
      circle.classList.add('is-filled')
    }
    waterCircles.push(circle)
    waterTrack.append(circle)
  }

  waterMeter.append(waterLabel, waterTrack)

  // Global Sun meter - 1 circle
  const sunMeter = document.createElement('div')
  sunMeter.className = 'resource-meter sun-meter'

  const sunLabel = document.createElement('span')
  sunLabel.className = 'resource-meter-label'
  sunLabel.textContent = 'Sun:'

  const sunTrack = document.createElement('div')
  sunTrack.className = 'resource-meter-track resource-circles'

  const sunCircle = document.createElement('span')
  sunCircle.className = 'resource-circle sun-circle is-filled'
  sunTrack.append(sunCircle)

  sunMeter.append(sunLabel, sunTrack)

  // Meter group for visual cohesion
  const meterGroup = document.createElement('div')
  meterGroup.className = 'meter-group'
  meterGroup.append(soilMeter, waterMeter, sunMeter)

  header.append(actions, meterGroup, logo)

  return {
    header,
    profileBadge,
    profileEmail,
    syncButton,
    soilMeterFill: soilFill,
    soilMeterValue: soilValue,
    waterCircles,
    sunCircle,
    waterMeter,
    sunMeter,
    soilMeter,
  }
}
