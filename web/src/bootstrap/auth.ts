import { initAuth, subscribeToAuth } from '../services/auth-service'
import { createLoginView, destroyLoginView } from '../ui/login-view'
import { isSupabaseConfigured } from '../lib/supabase'
import { pushEvent, subscribeToRealtime, unsubscribeFromRealtime, smartSync, startVisibilitySync } from '../services/sync-service'
import { setEventSyncCallback } from '../events/store'
import { syncNode } from '../ui/node-ui'
import type { AppContext } from '../types'

export type AuthCallbacks = {
  onSyncComplete: () => void
  onAuthStateChange: (hasUser: boolean) => void
}

let loginView: HTMLElement | null = null
let hasSynced = false

export async function initializeAuth(
  appElement: HTMLElement,
  ctx: AppContext,
  callbacks: AuthCallbacks
): Promise<void> {
  await initAuth()

  subscribeToAuth(async (state) => {
    if (state.loading) return

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
          console.warn(`Sync failed (${result.mode}):`, result.error)
          // Don't reload - use cached data as fallback
        } else if (result.pulled > 0) {
          console.info(`Synced ${result.pulled} events (${result.mode})`)
          callbacks.onSyncComplete()
        } else {
          console.info(`Sync complete, no new events (${result.mode})`)
        }

        // Enable real-time sync: push events as they're created
        setEventSyncCallback((event) => {
          pushEvent(event).then(({ error: pushError }) => {
            if (pushError) {
              console.warn('Failed to sync event:', pushError)
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
