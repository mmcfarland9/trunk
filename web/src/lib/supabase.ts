import type { SupabaseClient } from '@supabase/supabase-js'

// Lazy-loaded Supabase client — dynamic import keeps the SDK (~184KB) out of the
// initial bundle. The app renders from localStorage events while the SDK loads.
export let supabase: SupabaseClient | null = null

export async function initSupabase(): Promise<void> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return
  const { createClient } = await import('@supabase/supabase-js')
  supabase = createClient(url, key)
}

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}
