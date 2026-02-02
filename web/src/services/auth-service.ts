import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type AuthState = {
  user: User | null
  session: Session | null
  loading: boolean
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
  listeners.forEach(l => l(authState))
}

export async function initAuth(): Promise<void> {
  if (!supabase) {
    authState = { user: null, session: null, loading: false }
    notifyListeners()
    return
  }

  // Get initial session
  const { data: { session } } = await supabase.auth.getSession()
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

export async function verifyCode(
  email: string,
  code: string
): Promise<{ error: string | null }> {
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

export function isAuthenticated(): boolean {
  return authState.user !== null
}
