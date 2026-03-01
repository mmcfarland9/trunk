import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

type AuthState = {
  user: User | null
  session: Session | null
  loading: boolean
}

type NotificationChannel = 'email' | 'sms' | 'none'

type NotificationPreferences = {
  channel: NotificationChannel
  check_in_frequency: 'daily' | 'every3days' | 'weekly' | 'off'
  preferred_time: 'morning' | 'afternoon' | 'evening'
  notify_harvest_ready: boolean
  notify_shine_available: boolean
}

type UserProfile = {
  full_name?: string
  phone?: string
  timezone?: string
  notifications?: NotificationPreferences
}

let authState: AuthState = {
  user: null,
  session: null,
  loading: true,
}

type AuthListener = (state: AuthState) => void
const listeners: AuthListener[] = []

export function getAuthState(): AuthState {
  return authState
}

export function subscribeToAuth(listener: AuthListener): () => void {
  listeners.push(listener)
  listener(authState)
  return () => {
    const index = listeners.indexOf(listener)
    if (index > -1) listeners.splice(index, 1)
  }
}

function notifyListeners() {
  for (const l of listeners) l(authState)
}

const E2E_TEST_EMAIL = 'test@trunk.michaelpmcfarland.com'

async function handleE2ELogin(): Promise<void> {
  if (!supabase) return
  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/e2e-login`
  try {
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: E2E_TEST_EMAIL }),
    })
    if (!res.ok) return
    const data = await res.json()
    const session = data.session
    if (session?.access_token && session?.refresh_token) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
    }
  } catch {
    // E2E login failed — fall through to normal auth
  }
  // Strip ?e2e from URL without reload
  const url = new URL(window.location.href)
  url.searchParams.delete('e2e')
  window.history.replaceState({}, '', url.pathname + url.search)
}

export async function initAuth(): Promise<void> {
  if (!supabase) {
    authState = { user: null, session: null, loading: false }
    notifyListeners()
    return
  }

  // E2E login: ?e2e in URL triggers automatic test-user auth via edge function
  // Safe in production — edge function allowlists only the test email
  if (new URLSearchParams(window.location.search).has('e2e')) {
    await handleE2ELogin()
  }

  // Get initial session
  const {
    data: { session },
  } = await supabase.auth.getSession()
  authState = {
    user: session?.user ?? null,
    session,
    loading: false,
  }
  notifyListeners()

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    authState = {
      user: session?.user ?? null,
      session,
      loading: false,
    }
    notifyListeners()
  })
}

export async function requestCode(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  return { error: error?.message ?? null }
}

export async function verifyCode(email: string, code: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  })

  return { error: error?.message ?? null }
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

export function getUserProfile(): UserProfile {
  const metadata = authState.user?.user_metadata ?? {}
  return {
    full_name: metadata.full_name ?? '',
    phone: metadata.phone ?? '',
    timezone: metadata.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    notifications: {
      channel: metadata.notifications?.channel ?? 'email',
      check_in_frequency: metadata.notifications?.check_in_frequency ?? 'weekly',
      preferred_time: metadata.notifications?.preferred_time ?? 'morning',
      notify_harvest_ready: metadata.notifications?.notify_harvest_ready ?? true,
      notify_shine_available: metadata.notifications?.notify_shine_available ?? true,
    },
  }
}

export async function updateProfile(profile: UserProfile): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { error } = await supabase.auth.updateUser({
    data: profile,
  })

  return { error: error?.message ?? null }
}
