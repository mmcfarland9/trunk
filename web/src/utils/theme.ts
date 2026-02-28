const STORAGE_KEY = 'trunk-theme'

export type ThemePreference = 'auto' | 'light' | 'dark'

export function getTheme(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'auto'
}

export function setTheme(preference: ThemePreference): void {
  if (preference === 'auto') {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, preference)
  }
  applyTheme(preference)
}

export function applyTheme(preference?: ThemePreference): void {
  const pref = preference ?? getTheme()
  const html = document.documentElement

  html.classList.remove('light', 'dark')

  if (pref === 'light') {
    html.classList.add('light')
  } else if (pref === 'dark') {
    html.classList.add('dark')
  }
  // 'auto' — no class, let @media (prefers-color-scheme) handle it
}
