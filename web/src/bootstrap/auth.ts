import { initAuth, subscribeToAuth, getUserProfile } from '../services/auth-service'
import { createLoginView, destroyLoginView } from '../ui/login-view'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  pushEvent,
  subscribeToRealtime,
  unsubscribeFromRealtime,
  smartSync,
  startVisibilitySync,
} from '../services/sync'
import { setEventSyncCallback } from '../events/store'
import { syncNode } from '../ui/node-ui'
import type { AppContext } from '../types'

export type AuthCallbacks = {
  onSyncComplete: () => void
  onAuthStateChange: (hasUser: boolean) => void
}

let loginView: HTMLElement | null = null
let loadingView: HTMLElement | null = null
let hasSynced = false

function showLoadingState(appElement: HTMLElement): void {
  if (loadingView) return
  appElement.classList.add('hidden')
  loadingView = document.createElement('div')
  loadingView.className = 'auth-loading'
  loadingView.textContent = 'Loading...'
  document.body.prepend(loadingView)
}

function hideLoadingState(): void {
  if (loadingView) {
    loadingView.remove()
    loadingView = null
  }
}

function showAuthError(appElement: HTMLElement, message: string): void {
  hideLoadingState()
  appElement.classList.add('hidden')
  const errorView = document.createElement('div')
  errorView.className = 'auth-error'
  errorView.textContent = message
  document.body.prepend(errorView)
}

export async function initializeAuth(
  appElement: HTMLElement,
  ctx: AppContext,
  callbacks: AuthCallbacks,
): Promise<void> {
  showLoadingState(appElement)

  try {
    await initAuth()
  } catch (err) {
    showAuthError(appElement, 'Unable to connect. Please refresh to try again.')
    return
  }

  hideLoadingState()

  // Provide display name callback so UI modules don't import auth-service directly
  ctx.getUserDisplayName = () => getUserProfile().full_name || ''

  subscribeToAuth(async (state) => {
    if (state.loading) {
      showLoadingState(appElement)
      return
    }

    hideLoadingState()

    if (isSupabaseConfigured() && !state.user) {
      // Show login, hide app
      if (!loginView) {
        loginView = createLoginView()
        document.body.prepend(loginView)
      }
      appElement.classList.add('hidden')
      hasSynced = false
      callbacks.onAuthStateChange(false)
    } else {
      // Hide login, show app
      if (loginView) {
        loginView.remove()
        loginView = null
        destroyLoginView()
      }
      appElement.classList.remove('hidden')

      // Sync on first auth - cloud is single source of truth
      if (isSupabaseConfigured() && state.user && !hasSynced) {
        hasSynced = true

        // Smart sync: incremental if cache valid, full if not
        const result = await smartSync()
        if (result.error) {
          // Don't reload - use cached data as fallback
        } else if (result.pulled > 0) {
          callbacks.onSyncComplete()
        } else {
        }

        // Enable real-time sync: push events as they're created
        setEventSyncCallback((event) => {
          pushEvent(event).then(({ error: pushError }) => {
            if (pushError) {
            }
          })
        })

        // Subscribe to realtime for instant cross-device sync
        subscribeToRealtime(() => {
          callbacks.onSyncComplete()
        })

        // Sync when tab regains visibility (e.g. user switches back)
        startVisibilitySync()
      }

      // Disable sync callback and realtime when logged out
      if (!state.user) {
        setEventSyncCallback(null)
        unsubscribeFromRealtime()
      }

      // Update profile badge and sync button based on auth state
      if (state.user) {
        ctx.elements.profileBadge.classList.remove('hidden')
        ctx.elements.syncButton.classList.remove('hidden')
        // Force square: CSS aspect-ratio unreliable in flex stretch context
        requestAnimationFrame(() => {
          const btn = ctx.elements.syncButton
          btn.style.width = `${btn.offsetHeight}px`
        })
        ctx.elements.profileEmail.textContent = state.user.email || ''
        // Update trunk label with user's full_name from profile
        syncNode(ctx.elements.trunk)
        callbacks.onAuthStateChange(true)
      } else {
        ctx.elements.profileBadge.classList.add('hidden')
        ctx.elements.syncButton.classList.add('hidden')
        ctx.elements.profileEmail.textContent = ''
        callbacks.onAuthStateChange(false)
      }
    }
  })
}
