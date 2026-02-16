# Cloud Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Supabase-based cloud sync between iOS and web apps with email OTP authentication.

**Architecture:** Event-sourced sync using Supabase Postgres. Both apps push events to cloud, pull on open. Local storage (localStorage/SwiftData) acts as cache for offline use and instant UI.

**Tech Stack:** Supabase (Auth + Postgres), `@supabase/supabase-js` for web, `supabase-swift` for iOS.

---

## Phase 0: Supabase Project Setup (Manual)

> These steps are done in the Supabase dashboard, not code.

### Task 0.1: Create Supabase Project

**Steps:**
1. Go to https://supabase.com and sign in
2. Click "New project"
3. Name: `trunk`
4. Database password: Generate and save securely
5. Region: Choose closest to you
6. Wait for project to provision (~2 minutes)

### Task 0.2: Create Events Table

**Steps:**
1. Go to SQL Editor in Supabase dashboard
2. Run this SQL:

```sql
-- Events table (append-only event log per user)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    client_id UUID NOT NULL,
    client_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, client_id)
);

-- Index for fast queries by user and time
CREATE INDEX idx_events_user_created ON events(user_id, created_at);

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy: users can only access their own events
CREATE POLICY "Users can only access their own events"
ON events FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

3. Click "Run"
4. Verify table exists in Table Editor

### Task 0.3: Configure Email Auth

**Steps:**
1. Go to Authentication → Providers
2. Enable "Email" provider
3. Go to Authentication → Settings
4. Under "Email Auth":
   - Enable "Confirm email" = ON
   - Enable "Secure email change" = ON
5. Under "Email OTP":
   - OTP Expiry = 600 (10 minutes)
6. Save

### Task 0.4: Get API Keys

**Steps:**
1. Go to Settings → API
2. Copy "Project URL" (e.g., `https://xxxxx.supabase.co`)
3. Copy "anon public" key (safe to expose in client code)
4. Save both for use in app configuration

---

## Phase 1: Web App - Supabase Client

### Task 1.1: Install Supabase SDK

**Files:**
- Modify: `web/package.json`

**Step 1: Install dependency**

Run: `cd web && npm install @supabase/supabase-js`

**Step 2: Verify installation**

Run: `cd web && npm list @supabase/supabase-js`
Expected: `@supabase/supabase-js@2.x.x`

**Step 3: Commit**

```bash
cd web && git add package.json package-lock.json
git commit -m "feat(web): add supabase-js dependency"
```

### Task 1.2: Create Environment File

**Files:**
- Create: `web/.env.local`
- Modify: `web/.gitignore`

**Step 1: Create .env.local**

Create `web/.env.local`:
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

**Step 2: Add to .gitignore (if not already there)**

Verify `web/.gitignore` contains:
```
.env.local
.env.*.local
```

**Step 3: Create .env.example for documentation**

Create `web/.env.example`:
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Step 4: Commit**

```bash
git add web/.env.example web/.gitignore
git commit -m "feat(web): add environment config for Supabase"
```

### Task 1.3: Create Supabase Client Module

**Files:**
- Create: `web/src/lib/supabase.ts`

**Step 1: Create the lib directory and client file**

Create `web/src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Cloud sync disabled.')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}
```

**Step 2: Commit**

```bash
git add web/src/lib/supabase.ts
git commit -m "feat(web): create Supabase client module"
```

---

## Phase 2: Web App - Auth Service

### Task 2.1: Create Auth Service

**Files:**
- Create: `web/src/services/auth-service.ts`

**Step 1: Create the services directory and auth file**

Create `web/src/services/auth-service.ts`:
```typescript
import { supabase, isSupabaseConfigured } from '../lib/supabase'
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
```

**Step 2: Commit**

```bash
git add web/src/services/auth-service.ts
git commit -m "feat(web): add auth service with email OTP"
```

### Task 2.2: Create Login UI

**Files:**
- Create: `web/src/ui/login-view.ts`
- Create: `web/src/styles/login.css`

**Step 1: Create login view**

Create `web/src/ui/login-view.ts`:
```typescript
import {
  requestCode,
  verifyCode,
  getAuthState,
  subscribeToAuth,
} from '../services/auth-service'

type LoginViewElements = {
  container: HTMLElement
  emailInput: HTMLInputElement
  codeInput: HTMLInputElement
  emailForm: HTMLFormElement
  codeForm: HTMLFormElement
  errorMessage: HTMLElement
  loadingSpinner: HTMLElement
}

let elements: LoginViewElements | null = null
let currentEmail = ''

export function createLoginView(): HTMLElement {
  const container = document.createElement('div')
  container.className = 'login-view'
  container.innerHTML = `
    <div class="login-card">
      <h1>Trunk</h1>
      <p class="login-subtitle">Reap what you sow</p>

      <form class="login-form email-form">
        <label for="login-email">Email address</label>
        <input
          type="email"
          id="login-email"
          name="email"
          placeholder="you@example.com"
          required
          autocomplete="email"
        />
        <button type="submit">Send code</button>
      </form>

      <form class="login-form code-form hidden">
        <p class="code-sent-message">Code sent to <span class="sent-email"></span></p>
        <label for="login-code">6-digit code</label>
        <input
          type="text"
          id="login-code"
          name="code"
          placeholder="123456"
          required
          maxlength="6"
          pattern="[0-9]{6}"
          inputmode="numeric"
          autocomplete="one-time-code"
        />
        <button type="submit">Verify</button>
        <button type="button" class="back-button">Back</button>
      </form>

      <div class="login-error hidden"></div>
      <div class="login-loading hidden">
        <span class="spinner"></span>
      </div>
    </div>
  `

  elements = {
    container,
    emailInput: container.querySelector('#login-email')!,
    codeInput: container.querySelector('#login-code')!,
    emailForm: container.querySelector('.email-form')!,
    codeForm: container.querySelector('.code-form')!,
    errorMessage: container.querySelector('.login-error')!,
    loadingSpinner: container.querySelector('.login-loading')!,
  }

  setupEventListeners()
  return container
}

function setupEventListeners() {
  if (!elements) return

  elements.emailForm.addEventListener('submit', handleEmailSubmit)
  elements.codeForm.addEventListener('submit', handleCodeSubmit)
  elements.container.querySelector('.back-button')?.addEventListener('click', showEmailForm)
}

async function handleEmailSubmit(e: Event) {
  e.preventDefault()
  if (!elements) return

  const email = elements.emailInput.value.trim()
  if (!email) return

  showLoading(true)
  hideError()

  const { error } = await requestCode(email)

  showLoading(false)

  if (error) {
    showError(error)
    return
  }

  currentEmail = email
  showCodeForm()
}

async function handleCodeSubmit(e: Event) {
  e.preventDefault()
  if (!elements) return

  const code = elements.codeInput.value.trim()
  if (!code || code.length !== 6) return

  showLoading(true)
  hideError()

  const { error } = await verifyCode(currentEmail, code)

  showLoading(false)

  if (error) {
    showError(error)
    return
  }

  // Auth state change will hide login view automatically
}

function showEmailForm() {
  if (!elements) return
  elements.emailForm.classList.remove('hidden')
  elements.codeForm.classList.add('hidden')
  elements.codeInput.value = ''
  hideError()
}

function showCodeForm() {
  if (!elements) return
  elements.emailForm.classList.add('hidden')
  elements.codeForm.classList.remove('hidden')
  const sentEmailSpan = elements.container.querySelector('.sent-email')
  if (sentEmailSpan) sentEmailSpan.textContent = currentEmail
  elements.codeInput.focus()
}

function showLoading(show: boolean) {
  if (!elements) return
  elements.loadingSpinner.classList.toggle('hidden', !show)
  elements.emailInput.disabled = show
  elements.codeInput.disabled = show
}

function showError(message: string) {
  if (!elements) return
  elements.errorMessage.textContent = message
  elements.errorMessage.classList.remove('hidden')
}

function hideError() {
  if (!elements) return
  elements.errorMessage.classList.add('hidden')
}

export function destroyLoginView() {
  elements = null
}
```

**Step 2: Create login styles**

Create `web/src/styles/login.css`:
```css
.login-view {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  z-index: 1000;
}

.login-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 360px;
  text-align: center;
}

.login-card h1 {
  margin: 0 0 0.25rem;
  font-size: 1.75rem;
  color: var(--color-text);
}

.login-subtitle {
  margin: 0 0 1.5rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
}

.login-form label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.login-form input {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 1rem;
  background: var(--color-bg);
  color: var(--color-text);
}

.login-form input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.login-form button[type="submit"] {
  padding: 0.75rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 0.5rem;
}

.login-form button[type="submit"]:hover {
  opacity: 0.9;
}

.login-form button[type="submit"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.back-button {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.875rem;
  text-decoration: underline;
}

.code-sent-message {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.sent-email {
  color: var(--color-text);
  font-weight: 500;
}

.login-error {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--color-error-bg, #fee2e2);
  color: var(--color-error, #dc2626);
  border-radius: 6px;
  font-size: 0.875rem;
}

.login-loading {
  margin-top: 1rem;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.hidden {
  display: none !important;
}
```

**Step 3: Import login styles**

Add to `web/src/styles/index.css`:
```css
@import './login.css';
```

**Step 4: Commit**

```bash
git add web/src/ui/login-view.ts web/src/styles/login.css web/src/styles/index.css
git commit -m "feat(web): add login UI with email and code forms"
```

### Task 2.3: Integrate Auth into Main App

**Files:**
- Modify: `web/src/main.ts`

**Step 1: Read current main.ts to understand structure**

Read `web/src/main.ts` to see initialization flow.

**Step 2: Add auth initialization and gating**

At the top of `web/src/main.ts`, add imports:
```typescript
import { initAuth, subscribeToAuth, isAuthenticated } from './services/auth-service'
import { createLoginView, destroyLoginView } from './ui/login-view'
import { isSupabaseConfigured } from './lib/supabase'
```

**Step 3: Wrap app initialization in auth check**

Modify the initialization to:
1. Initialize auth first
2. Show login view if not authenticated and Supabase is configured
3. Hide login view and show app when authenticated

Add before the existing initialization:
```typescript
let loginView: HTMLElement | null = null
let appInitialized = false

async function startApp() {
  await initAuth()

  subscribeToAuth((state) => {
    if (state.loading) return

    if (isSupabaseConfigured() && !state.user) {
      // Show login, hide app
      if (!loginView) {
        loginView = createLoginView()
        document.body.prepend(loginView)
      }
      document.querySelector('.app')?.classList.add('hidden')
    } else {
      // Hide login, show app
      if (loginView) {
        loginView.remove()
        loginView = null
        destroyLoginView()
      }
      document.querySelector('.app')?.classList.remove('hidden')

      if (!appInitialized) {
        appInitialized = true
        initializeApp() // existing app init code
      }
    }
  })
}

startApp()
```

**Step 4: Commit**

```bash
git add web/src/main.ts
git commit -m "feat(web): integrate auth flow into main app"
```

---

## Phase 3: Web App - Sync Service

### Task 3.1: Define Sync Event Types

**Files:**
- Create: `web/src/services/sync-types.ts`

**Step 1: Create sync types file**

Create `web/src/services/sync-types.ts`:
```typescript
// Event format for Supabase storage
export type SyncEvent = {
  id: string
  user_id: string
  type: string
  payload: Record<string, unknown>
  client_id: string
  client_timestamp: string
  created_at: string
}

// Local event format (existing)
export type LocalEvent = {
  type: string
  payload: Record<string, unknown>
  clientId: string
  timestamp: string
  synced?: boolean
}

export function localToSyncEvent(
  local: LocalEvent,
  userId: string
): Omit<SyncEvent, 'id' | 'created_at'> {
  return {
    user_id: userId,
    type: local.type,
    payload: local.payload,
    client_id: local.clientId,
    client_timestamp: local.timestamp,
  }
}

export function syncToLocalEvent(sync: SyncEvent): LocalEvent {
  return {
    type: sync.type,
    payload: sync.payload,
    clientId: sync.client_id,
    timestamp: sync.client_timestamp,
    synced: true,
  }
}
```

**Step 2: Commit**

```bash
git add web/src/services/sync-types.ts
git commit -m "feat(web): add sync event type definitions"
```

### Task 3.2: Create Sync Service

**Files:**
- Create: `web/src/services/sync-service.ts`

**Step 1: Create sync service**

Create `web/src/services/sync-service.ts`:
```typescript
import { supabase } from '../lib/supabase'
import { getAuthState } from './auth-service'
import { getEvents, appendEvents, replaceEvents } from '../events'
import type { SyncEvent, LocalEvent } from './sync-types'
import { localToSyncEvent, syncToLocalEvent } from './sync-types'

const LAST_SYNC_KEY = 'trunk-last-sync'
const PENDING_EVENTS_KEY = 'trunk-pending-sync'

export async function pullEvents(): Promise<{ pulled: number; error: string | null }> {
  if (!supabase) return { pulled: 0, error: 'Supabase not configured' }

  const { user } = getAuthState()
  if (!user) return { pulled: 0, error: 'Not authenticated' }

  try {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY)

    let query = supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: true })

    if (lastSync) {
      query = query.gt('created_at', lastSync)
    }

    const { data: events, error } = await query

    if (error) {
      return { pulled: 0, error: error.message }
    }

    if (events && events.length > 0) {
      const localEvents = events.map(syncToLocalEvent)

      // Merge with existing local events, avoiding duplicates by clientId
      const existingEvents = getEvents()
      const existingClientIds = new Set(existingEvents.map(e => e.clientId))
      const newEvents = localEvents.filter(e => !existingClientIds.has(e.clientId))

      if (newEvents.length > 0) {
        appendEvents(newEvents)
      }

      // Update last sync timestamp
      const latest = events[events.length - 1].created_at
      localStorage.setItem(LAST_SYNC_KEY, latest)

      return { pulled: newEvents.length, error: null }
    }

    return { pulled: 0, error: null }
  } catch (err) {
    return { pulled: 0, error: String(err) }
  }
}

export async function pushEvent(event: LocalEvent): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { user } = getAuthState()
  if (!user) return { error: 'Not authenticated' }

  try {
    const syncEvent = localToSyncEvent(event, user.id)

    const { error } = await supabase.from('events').insert(syncEvent)

    // 23505 = unique constraint violation (duplicate client_id)
    if (error && error.code !== '23505') {
      // Queue for retry
      addToPendingQueue(event)
      return { error: error.message }
    }

    // Mark as synced in local storage
    markEventSynced(event.clientId)
    return { error: null }
  } catch (err) {
    addToPendingQueue(event)
    return { error: String(err) }
  }
}

export async function pushPendingEvents(): Promise<{ pushed: number; failed: number }> {
  const pending = getPendingQueue()
  if (pending.length === 0) return { pushed: 0, failed: 0 }

  let pushed = 0
  let failed = 0

  for (const event of pending) {
    const { error } = await pushEvent(event)
    if (error) {
      failed++
    } else {
      pushed++
      removeFromPendingQueue(event.clientId)
    }
  }

  return { pushed, failed }
}

export async function uploadAllLocalEvents(): Promise<{ uploaded: number; error: string | null }> {
  if (!supabase) return { uploaded: 0, error: 'Supabase not configured' }

  const { user } = getAuthState()
  if (!user) return { uploaded: 0, error: 'Not authenticated' }

  const events = getEvents()
  const unsyncedEvents = events.filter(e => !e.synced)

  if (unsyncedEvents.length === 0) {
    return { uploaded: 0, error: null }
  }

  try {
    const syncEvents = unsyncedEvents.map(e => localToSyncEvent(e, user.id))

    const { error } = await supabase.from('events').insert(syncEvents)

    if (error && error.code !== '23505') {
      return { uploaded: 0, error: error.message }
    }

    // Mark all as synced
    const updatedEvents = events.map(e => ({ ...e, synced: true }))
    replaceEvents(updatedEvents)

    return { uploaded: unsyncedEvents.length, error: null }
  } catch (err) {
    return { uploaded: 0, error: String(err) }
  }
}

// Pending queue helpers
function getPendingQueue(): LocalEvent[] {
  const stored = localStorage.getItem(PENDING_EVENTS_KEY)
  return stored ? JSON.parse(stored) : []
}

function addToPendingQueue(event: LocalEvent) {
  const pending = getPendingQueue()
  if (!pending.some(e => e.clientId === event.clientId)) {
    pending.push(event)
    localStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(pending))
  }
}

function removeFromPendingQueue(clientId: string) {
  const pending = getPendingQueue().filter(e => e.clientId !== clientId)
  localStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(pending))
}

function markEventSynced(clientId: string) {
  const events = getEvents()
  const updated = events.map(e =>
    e.clientId === clientId ? { ...e, synced: true } : e
  )
  replaceEvents(updated)
}
```

**Step 2: Commit**

```bash
git add web/src/services/sync-service.ts
git commit -m "feat(web): add sync service for push/pull events"
```

### Task 3.3: Integrate Sync into App Lifecycle

**Files:**
- Modify: `web/src/main.ts`

**Step 1: Add sync on app open and after actions**

Add imports:
```typescript
import { pullEvents, pushPendingEvents } from './services/sync-service'
```

In the auth subscription callback, after app is initialized:
```typescript
// After auth, pull latest events
if (state.user && appInitialized) {
  pullEvents().then(({ pulled, error }) => {
    if (error) console.warn('Sync pull failed:', error)
    else if (pulled > 0) console.log(`Synced ${pulled} events from cloud`)
  })

  pushPendingEvents().then(({ pushed, failed }) => {
    if (pushed > 0) console.log(`Pushed ${pushed} pending events`)
    if (failed > 0) console.warn(`Failed to push ${failed} events`)
  })
}
```

**Step 2: Commit**

```bash
git add web/src/main.ts
git commit -m "feat(web): trigger sync on app open and auth"
```

### Task 3.4: Hook Sync into Event Append

**Files:**
- Modify: `web/src/events/store.ts`

**Step 1: Read current store.ts**

Review `web/src/events/store.ts` to understand the `appendEvent` function.

**Step 2: Add sync call after event append**

Add to `appendEvent` function to also push to cloud:
```typescript
import { pushEvent } from '../services/sync-service'

export function appendEvent(event: TrunkEvent) {
  // ... existing local append logic ...

  // Push to cloud (fire and forget, retry handled by sync service)
  pushEvent({
    type: event.type,
    payload: event as Record<string, unknown>,
    clientId: event.clientId || crypto.randomUUID(),
    timestamp: event.timestamp || new Date().toISOString(),
  }).catch(err => console.warn('Sync push failed:', err))
}
```

**Step 3: Commit**

```bash
git add web/src/events/store.ts
git commit -m "feat(web): push events to cloud on append"
```

---

## Phase 4: iOS App - Supabase Setup

### Task 4.1: Add Supabase Swift Package

**Files:**
- Modify: `ios/Trunk.xcodeproj` (via Xcode)

**Steps:**
1. Open `ios/Trunk.xcodeproj` in Xcode
2. File → Add Package Dependencies
3. Enter: `https://github.com/supabase/supabase-swift`
4. Select version: Up to Next Major (2.0.0)
5. Add to target: Trunk
6. Wait for package to resolve

**Verify:**
- Package appears in Project Navigator under "Package Dependencies"

### Task 4.2: Create Supabase Configuration

**Files:**
- Create: `ios/Trunk/Config/Secrets.swift`
- Add to `.gitignore`

**Step 1: Create Secrets file**

Create `ios/Trunk/Config/Secrets.swift`:
```swift
import Foundation

enum Secrets {
    static let supabaseURL = "https://YOUR_PROJECT_ID.supabase.co"
    static let supabaseAnonKey = "YOUR_ANON_KEY"
}
```

**Step 2: Add to gitignore**

Add to root `.gitignore`:
```
ios/Trunk/Config/Secrets.swift
```

**Step 3: Create Secrets.example.swift**

Create `ios/Trunk/Config/Secrets.example.swift`:
```swift
import Foundation

enum Secrets {
    static let supabaseURL = "https://xxxxx.supabase.co"
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Step 4: Commit**

```bash
git add .gitignore ios/Trunk/Config/Secrets.example.swift
git commit -m "feat(ios): add Supabase config structure"
```

### Task 4.3: Create Supabase Client

**Files:**
- Create: `ios/Trunk/Services/SupabaseClient.swift`

**Step 1: Create the client**

Create `ios/Trunk/Services/SupabaseClient.swift`:
```swift
import Foundation
import Supabase

final class SupabaseClient {
    static let shared: Supabase.SupabaseClient? = {
        guard !Secrets.supabaseURL.contains("xxxxx"),
              !Secrets.supabaseAnonKey.contains("...") else {
            print("Supabase not configured. Cloud sync disabled.")
            return nil
        }

        guard let url = URL(string: Secrets.supabaseURL) else {
            print("Invalid Supabase URL")
            return nil
        }

        return Supabase.SupabaseClient(
            supabaseURL: url,
            supabaseKey: Secrets.supabaseAnonKey
        )
    }()

    static var isConfigured: Bool {
        shared != nil
    }
}
```

**Step 2: Commit**

```bash
git add ios/Trunk/Services/SupabaseClient.swift
git commit -m "feat(ios): create Supabase client singleton"
```

---

## Phase 5: iOS App - Auth Service

### Task 5.1: Create Auth Service

**Files:**
- Create: `ios/Trunk/Services/AuthService.swift`

**Step 1: Create auth service**

Create `ios/Trunk/Services/AuthService.swift`:
```swift
import Foundation
import Supabase

@MainActor
@Observable
final class AuthService {
    static let shared = AuthService()

    private(set) var user: User?
    private(set) var session: Session?
    private(set) var isLoading = true

    var isAuthenticated: Bool {
        user != nil
    }

    private init() {}

    func initialize() async {
        guard let client = SupabaseClient.shared else {
            isLoading = false
            return
        }

        do {
            session = try await client.auth.session
            user = session?.user
        } catch {
            print("Failed to get session: \(error)")
        }

        isLoading = false

        // Listen for auth changes
        Task {
            for await (event, session) in client.auth.authStateChanges {
                self.session = session
                self.user = session?.user
            }
        }
    }

    func requestCode(email: String) async throws {
        guard let client = SupabaseClient.shared else {
            throw AuthError.notConfigured
        }

        try await client.auth.signInWithOTP(
            email: email,
            shouldCreateUser: true
        )
    }

    func verifyCode(email: String, code: String) async throws {
        guard let client = SupabaseClient.shared else {
            throw AuthError.notConfigured
        }

        try await client.auth.verifyOTP(
            email: email,
            token: code,
            type: .email
        )
    }

    func signOut() async throws {
        guard let client = SupabaseClient.shared else { return }
        try await client.auth.signOut()
    }
}

enum AuthError: LocalizedError {
    case notConfigured

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Supabase is not configured"
        }
    }
}
```

**Step 2: Commit**

```bash
git add ios/Trunk/Services/AuthService.swift
git commit -m "feat(ios): add auth service with email OTP"
```

### Task 5.2: Create Login View

**Files:**
- Create: `ios/Trunk/Views/LoginView.swift`

**Step 1: Create login view**

Create `ios/Trunk/Views/LoginView.swift`:
```swift
import SwiftUI

struct LoginView: View {
    @State private var email = ""
    @State private var code = ""
    @State private var showCodeEntry = false
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Text("Trunk")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("Reap what you sow")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .italic()

            Spacer()

            if showCodeEntry {
                codeEntryForm
            } else {
                emailForm
            }

            if let error = errorMessage {
                Text(error)
                    .foregroundStyle(.red)
                    .font(.caption)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            Spacer()
        }
        .padding()
        .disabled(isLoading)
        .overlay {
            if isLoading {
                ProgressView()
            }
        }
    }

    private var emailForm: some View {
        VStack(spacing: 16) {
            TextField("Email address", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .textFieldStyle(.roundedBorder)

            Button("Send code") {
                Task { await requestCode() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(email.isEmpty)
        }
        .frame(maxWidth: 300)
    }

    private var codeEntryForm: some View {
        VStack(spacing: 16) {
            Text("Code sent to \(email)")
                .font(.caption)
                .foregroundStyle(.secondary)

            TextField("6-digit code", text: $code)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .textFieldStyle(.roundedBorder)
                .multilineTextAlignment(.center)

            Button("Verify") {
                Task { await verifyCode() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(code.count != 6)

            Button("Back") {
                showCodeEntry = false
                code = ""
                errorMessage = nil
            }
            .buttonStyle(.borderless)
        }
        .frame(maxWidth: 300)
    }

    private func requestCode() async {
        isLoading = true
        errorMessage = nil

        do {
            try await AuthService.shared.requestCode(email: email)
            showCodeEntry = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func verifyCode() async {
        isLoading = true
        errorMessage = nil

        do {
            try await AuthService.shared.verifyCode(email: email, code: code)
            // Auth state change will dismiss this view
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    LoginView()
}
```

**Step 2: Commit**

```bash
git add ios/Trunk/Views/LoginView.swift
git commit -m "feat(ios): add login view with email and code entry"
```

### Task 5.3: Integrate Auth into App

**Files:**
- Modify: `ios/Trunk/TrunkApp.swift`
- Modify: `ios/Trunk/ContentView.swift`

**Step 1: Initialize auth in TrunkApp**

In `TrunkApp.swift`, add:
```swift
import SwiftUI

@main
struct TrunkApp: App {
    @State private var authService = AuthService.shared

    init() {
        Task {
            await AuthService.shared.initialize()
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authService)
        }
        .modelContainer(sharedModelContainer)
    }

    // ... existing modelContainer code ...
}
```

**Step 2: Gate ContentView behind auth**

In `ContentView.swift`, modify to show login when not authenticated:
```swift
import SwiftUI

struct ContentView: View {
    @Environment(AuthService.self) private var authService

    var body: some View {
        Group {
            if authService.isLoading {
                ProgressView("Loading...")
            } else if SupabaseClient.isConfigured && !authService.isAuthenticated {
                LoginView()
            } else {
                MainTabView()
            }
        }
    }
}
```

**Step 3: Commit**

```bash
git add ios/Trunk/TrunkApp.swift ios/Trunk/ContentView.swift
git commit -m "feat(ios): integrate auth flow into app"
```

---

## Phase 6: iOS App - Sync Service

### Task 6.1: Create Sync Event Model

**Files:**
- Create: `ios/Trunk/Services/SyncEvent.swift`

**Step 1: Create sync event model**

Create `ios/Trunk/Services/SyncEvent.swift`:
```swift
import Foundation

struct SyncEvent: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let type: String
    let payload: [String: AnyCodable]
    let clientId: UUID
    let clientTimestamp: Date
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case type
        case payload
        case clientId = "client_id"
        case clientTimestamp = "client_timestamp"
        case createdAt = "created_at"
    }
}

// For encoding/decoding arbitrary JSON
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let string = try? container.decode(String.self) {
            value = string
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if container.decodeNil() {
            value = NSNull()
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode value")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let string as String:
            try container.encode(string)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let bool as Bool:
            try container.encode(bool)
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case is NSNull:
            try container.encodeNil()
        default:
            throw EncodingError.invalidValue(value, .init(codingPath: [], debugDescription: "Cannot encode value"))
        }
    }
}
```

**Step 2: Commit**

```bash
git add ios/Trunk/Services/SyncEvent.swift
git commit -m "feat(ios): add sync event model for Supabase"
```

### Task 6.2: Create Sync Service

**Files:**
- Create: `ios/Trunk/Services/SyncService.swift`

**Step 1: Create sync service**

Create `ios/Trunk/Services/SyncService.swift`:
```swift
import Foundation
import SwiftData

@MainActor
final class SyncService {
    static let shared = SyncService()

    private let lastSyncKey = "trunk-last-sync"

    private init() {}

    func pullEvents(modelContext: ModelContext) async throws -> Int {
        guard let client = SupabaseClient.shared else {
            throw SyncError.notConfigured
        }

        guard AuthService.shared.isAuthenticated else {
            throw SyncError.notAuthenticated
        }

        let lastSync = UserDefaults.standard.string(forKey: lastSyncKey)

        var query = client
            .from("events")
            .select()
            .order("created_at")

        if let lastSync {
            query = query.gt("created_at", value: lastSync)
        }

        let events: [SyncEvent] = try await query.execute().value

        guard !events.isEmpty else { return 0 }

        // Convert events to local models
        for event in events {
            try applyEvent(event, to: modelContext)
        }

        // Save last sync timestamp
        if let latest = events.last?.createdAt {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            UserDefaults.standard.set(formatter.string(from: latest), forKey: lastSyncKey)
        }

        try modelContext.save()

        return events.count
    }

    func pushEvent(type: String, payload: [String: Any]) async throws {
        guard let client = SupabaseClient.shared else {
            throw SyncError.notConfigured
        }

        guard let userId = AuthService.shared.user?.id else {
            throw SyncError.notAuthenticated
        }

        let event: [String: Any] = [
            "user_id": userId.uuidString,
            "type": type,
            "payload": payload,
            "client_id": UUID().uuidString,
            "client_timestamp": ISO8601DateFormatter().string(from: Date())
        ]

        try await client
            .from("events")
            .insert(event)
            .execute()
    }

    private func applyEvent(_ event: SyncEvent, to context: ModelContext) throws {
        // Apply event based on type
        switch event.type {
        case "sprout_planted":
            // Create sprout from payload
            // Implementation depends on payload structure
            break
        case "sprout_watered":
            // Add water entry
            break
        case "sprout_harvested":
            // Update sprout result
            break
        case "sprout_uprooted":
            // Mark sprout as uprooted
            break
        case "sun_shone":
            // Add sun entry
            break
        case "leaf_created":
            // Create leaf
            break
        default:
            print("Unknown event type: \(event.type)")
        }
    }
}

enum SyncError: LocalizedError {
    case notConfigured
    case notAuthenticated

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Supabase is not configured"
        case .notAuthenticated:
            return "Not authenticated"
        }
    }
}
```

**Step 2: Commit**

```bash
git add ios/Trunk/Services/SyncService.swift
git commit -m "feat(ios): add sync service for push/pull"
```

### Task 6.3: Trigger Sync on App Open

**Files:**
- Modify: `ios/Trunk/ContentView.swift`

**Step 1: Add sync on appear**

In `ContentView.swift`, add:
```swift
struct ContentView: View {
    @Environment(AuthService.self) private var authService
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        Group {
            if authService.isLoading {
                ProgressView("Loading...")
            } else if SupabaseClient.isConfigured && !authService.isAuthenticated {
                LoginView()
            } else {
                MainTabView()
                    .task {
                        await syncOnOpen()
                    }
            }
        }
    }

    private func syncOnOpen() async {
        guard authService.isAuthenticated else { return }

        do {
            let pulled = try await SyncService.shared.pullEvents(modelContext: modelContext)
            if pulled > 0 {
                print("Synced \(pulled) events from cloud")
            }
        } catch {
            print("Sync failed: \(error)")
        }
    }
}
```

**Step 2: Commit**

```bash
git add ios/Trunk/ContentView.swift
git commit -m "feat(ios): trigger sync on app open"
```

---

## Phase 7: Testing & Migration

### Task 7.1: Test Auth Flow (Web)

**Steps:**
1. Run `cd web && npm run dev`
2. Open http://localhost:5173
3. Verify login view appears
4. Enter your email
5. Check email for code
6. Enter code
7. Verify app loads

### Task 7.2: Test Auth Flow (iOS)

**Steps:**
1. Open Xcode, run on simulator
2. Verify login view appears
3. Enter your email
4. Check email for code
5. Enter code
6. Verify app loads

### Task 7.3: Test Sync (Web)

**Steps:**
1. Log in on web
2. Create a sprout
3. Check Supabase dashboard → Table Editor → events
4. Verify event appears

### Task 7.4: Test Sync (iOS)

**Steps:**
1. Log in on iOS
2. Verify sprout from web appears
3. Water the sprout
4. Check Supabase dashboard
5. Verify water event appears

### Task 7.5: Migrate Existing Data (Web)

**Files:**
- Create: `web/src/utils/migrate-to-cloud.ts`

**Step 1: Create migration utility**

Create `web/src/utils/migrate-to-cloud.ts`:
```typescript
import { uploadAllLocalEvents } from '../services/sync-service'
import { isAuthenticated } from '../services/auth-service'

export async function migrateToCloud(): Promise<{ success: boolean; count: number; error?: string }> {
  if (!isAuthenticated()) {
    return { success: false, count: 0, error: 'Not authenticated' }
  }

  const { uploaded, error } = await uploadAllLocalEvents()

  if (error) {
    return { success: false, count: 0, error }
  }

  return { success: true, count: uploaded }
}
```

**Step 2: Add migration prompt to UI**

Add a one-time migration prompt when user first logs in with existing local data.

**Step 3: Commit**

```bash
git add web/src/utils/migrate-to-cloud.ts
git commit -m "feat(web): add migration utility for existing data"
```

---

## Summary

### Files Created

**Web:**
- `web/.env.local` (gitignored)
- `web/.env.example`
- `web/src/lib/supabase.ts`
- `web/src/services/auth-service.ts`
- `web/src/services/sync-service.ts`
- `web/src/services/sync-types.ts`
- `web/src/ui/login-view.ts`
- `web/src/styles/login.css`
- `web/src/utils/migrate-to-cloud.ts`

**iOS:**
- `ios/Trunk/Config/Secrets.swift` (gitignored)
- `ios/Trunk/Config/Secrets.example.swift`
- `ios/Trunk/Services/SupabaseClient.swift`
- `ios/Trunk/Services/AuthService.swift`
- `ios/Trunk/Services/SyncService.swift`
- `ios/Trunk/Services/SyncEvent.swift`
- `ios/Trunk/Views/LoginView.swift`

**Modified:**
- `web/package.json` (added supabase-js)
- `web/src/main.ts` (auth integration)
- `web/src/events/store.ts` (sync on append)
- `web/src/styles/index.css` (import login.css)
- `ios/Trunk.xcodeproj` (added supabase-swift package)
- `ios/Trunk/TrunkApp.swift` (auth init)
- `ios/Trunk/ContentView.swift` (auth gate, sync trigger)
- `.gitignore` (secrets files)

### Commits (Expected: ~20)

Each task produces one focused commit following conventional commits format.
