# iOS Sync Service Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port web's smartSync, cache versioning, sync status tracking, and visual indicator to iOS for full cross-platform parity.

**Architecture:** SyncService becomes an ObservableObject with @Published status. Uses UserDefaults for cache version and last sync timestamp. SyncIndicatorView is a small SwiftUI component showing a cloud icon with colored dot, embedded in GreetingHeader. Uses real traffic light colors (green/yellow/red) matching web.

**Tech Stack:** Swift, SwiftUI, Supabase, UserDefaults, Combine

---

### Task 1: Add SyncStatus enum and storage constants

**Files:**
- Modify: `ios/Trunk/Services/SyncService.swift`

**Step 1: Add SyncStatus enum and constants at the top of the file**

After the imports, add:

```swift
// MARK: - Sync Types

enum SyncStatus: String {
    case idle
    case syncing
    case success
    case error
}

enum SyncMode: String {
    case incremental
    case full
}

struct SyncResult {
    let status: SyncStatus
    let pulled: Int
    let error: String?
    let mode: SyncMode
}

// MARK: - Storage Constants

private let cacheVersion = 1
private let cacheVersionKey = "trunk-cache-version"
private let lastSyncKey = "trunk-last-sync"
```

**Step 2: Build the project**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add ios/Trunk/Services/SyncService.swift
git commit -m "feat(ios): add SyncStatus enum and storage constants"
```

---

### Task 2: Add cache validation helpers

**Files:**
- Modify: `ios/Trunk/Services/SyncService.swift`

**Step 1: Add cache validation methods to SyncService**

Add after the `private init() {}`:

```swift
    // MARK: - Cache Management

    /// Check if cache version matches current version
    private func isCacheValid() -> Bool {
        let stored = UserDefaults.standard.integer(forKey: cacheVersionKey)
        return stored == cacheVersion
    }

    /// Update stored cache version to current
    private func setCacheVersion() {
        UserDefaults.standard.set(cacheVersion, forKey: cacheVersionKey)
    }

    /// Clear cache version (forces full sync on next load)
    private func clearCacheVersion() {
        UserDefaults.standard.removeObject(forKey: cacheVersionKey)
    }

    /// Get last sync timestamp
    private func getLastSync() -> String? {
        UserDefaults.standard.string(forKey: lastSyncKey)
    }

    /// Set last sync timestamp
    private func setLastSync(_ timestamp: String) {
        UserDefaults.standard.set(timestamp, forKey: lastSyncKey)
    }

    /// Clear last sync timestamp
    private func clearLastSync() {
        UserDefaults.standard.removeObject(forKey: lastSyncKey)
    }
```

**Step 2: Build the project**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add ios/Trunk/Services/SyncService.swift
git commit -m "feat(ios): add cache validation helpers"
```

---

### Task 3: Add @Published sync status property

**Files:**
- Modify: `ios/Trunk/Services/SyncService.swift`

**Step 1: Make SyncService an ObservableObject with @Published status**

Change the class declaration from:

```swift
@MainActor
final class SyncService {
    static let shared = SyncService()

    private var realtimeChannel: RealtimeChannelV2?
    private var onRealtimeEvent: ((SyncEvent) -> Void)?

    private init() {}
```

To:

```swift
@MainActor
final class SyncService: ObservableObject {
    static let shared = SyncService()

    @Published private(set) var syncStatus: SyncStatus = .idle

    private var realtimeChannel: RealtimeChannelV2?
    private var onRealtimeEvent: ((SyncEvent) -> Void)?

    private init() {}
```

**Step 2: Build the project**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add ios/Trunk/Services/SyncService.swift
git commit -m "feat(ios): add @Published syncStatus property"
```

---

### Task 4: Add incremental pullEvents function

**Files:**
- Modify: `ios/Trunk/Services/SyncService.swift`

**Step 1: Add pullEvents (incremental) function**

Add after the cache management section:

```swift
    // MARK: - Sync Operations

    /// Pull events since last sync (incremental)
    private func pullEvents() async throws -> (pulled: Int, error: String?) {
        guard let client = SupabaseClientProvider.shared else {
            return (0, "Supabase not configured")
        }

        guard AuthService.shared.isAuthenticated else {
            return (0, "Not authenticated")
        }

        let lastSync = getLastSync()

        var query = client
            .from("events")
            .select()
            .order("created_at")

        if let lastSync = lastSync {
            query = query.gt("created_at", value: lastSync)
        }

        let syncEvents: [SyncEvent] = try await query.execute().value

        if !syncEvents.isEmpty {
            // Merge with existing events, avoiding duplicates by client_timestamp
            let existingTimestamps = Set(EventStore.shared.events.map { $0.clientTimestamp })
            let uniqueNewEvents = syncEvents.filter { !existingTimestamps.contains($0.clientTimestamp) }

            if !uniqueNewEvents.isEmpty {
                for event in uniqueNewEvents {
                    EventStore.shared.appendEvent(event)
                }
            }

            // Update last sync timestamp
            if let latest = syncEvents.last?.createdAt {
                setLastSync(latest)
            }

            return (uniqueNewEvents.count, nil)
        }

        return (0, nil)
    }
```

**Step 2: Build the project**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add ios/Trunk/Services/SyncService.swift
git commit -m "feat(ios): add incremental pullEvents function"
```

---

### Task 5: Create smartSync function

**Files:**
- Modify: `ios/Trunk/Services/SyncService.swift`

**Step 1: Add smartSync function**

Add after the `pullEvents` function:

```swift
    /// Smart sync: incremental if cache valid, full otherwise.
    /// Uses cached data as fallback if network fails.
    func smartSync() async -> SyncResult {
        guard SupabaseClientProvider.shared != nil else {
            return SyncResult(status: .error, pulled: 0, error: "Supabase not configured", mode: .full)
        }

        guard AuthService.shared.isAuthenticated else {
            return SyncResult(status: .error, pulled: 0, error: "Not authenticated", mode: .full)
        }

        syncStatus = .syncing

        let cacheValid = isCacheValid()
        let mode: SyncMode = cacheValid ? .incremental : .full

        do {
            let result: (pulled: Int, error: String?)

            if cacheValid {
                // Incremental: pull only new events since last sync
                result = try await pullEvents()
            } else {
                // Full: clear and pull everything
                // But don't clear cache until we have new data (fallback protection)
                guard let client = SupabaseClientProvider.shared else {
                    syncStatus = .error
                    return SyncResult(status: .error, pulled: 0, error: "Supabase not configured", mode: mode)
                }

                let syncEvents: [SyncEvent] = try await client
                    .from("events")
                    .select()
                    .order("created_at")
                    .execute()
                    .value

                // Success - now safe to replace cache
                EventStore.shared.setEvents(syncEvents)
                setCacheVersion()

                if let latest = syncEvents.last?.createdAt {
                    setLastSync(latest)
                }

                result = (syncEvents.count, nil)
            }

            if let error = result.error {
                syncStatus = .error
                return SyncResult(status: .error, pulled: 0, error: error, mode: mode)
            }

            // Update cache version on successful incremental sync too
            if cacheValid && result.pulled > 0 {
                setCacheVersion()
            }

            syncStatus = .success
            return SyncResult(status: .success, pulled: result.pulled, error: nil, mode: mode)

        } catch {
            // Network error - use cached data as fallback
            print("Sync exception, using cached data: \(error)")
            syncStatus = .error
            return SyncResult(status: .error, pulled: 0, error: error.localizedDescription, mode: mode)
        }
    }
```

**Step 2: Build the project**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add ios/Trunk/Services/SyncService.swift
git commit -m "feat(ios): add smartSync with incremental/full modes and fallback"
```

---

### Task 6: Add clearLocalCache function

**Files:**
- Modify: `ios/Trunk/Services/SyncService.swift`

**Step 1: Add clearLocalCache function**

Add after `smartSync`:

```swift
    /// Clear local cache (events and sync timestamp)
    /// Used to ensure cloud is always source of truth
    func clearLocalCache() {
        clearLastSync()
        clearCacheVersion()
        EventStore.shared.clearEvents()
    }
```

**Step 2: Build the project**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add ios/Trunk/Services/SyncService.swift
git commit -m "feat(ios): add clearLocalCache function"
```

---

### Task 7: Create SyncIndicatorView component

**Files:**
- Create: `ios/Trunk/Components/SyncIndicatorView.swift`

**Step 1: Create the sync indicator view**

```swift
//
//  SyncIndicatorView.swift
//  Trunk
//
//  Visual sync status indicator - cloud icon with colored dot.
//  Matches web implementation with traffic light colors.
//

import SwiftUI

struct SyncIndicatorView: View {
    @ObservedObject var syncService = SyncService.shared

    // Traffic light colors matching web CSS
    private var dotColor: Color {
        switch syncService.syncStatus {
        case .idle:
            return Color(red: 0.533, green: 0.533, blue: 0.533) // #888
        case .syncing:
            return Color(red: 0.902, green: 0.722, blue: 0.0)   // #e6b800
        case .success:
            return Color(red: 0.133, green: 0.647, blue: 0.133) // #22a522
        case .error:
            return Color(red: 0.851, green: 0.325, blue: 0.310) // #d9534f
        }
    }

    private var statusText: String {
        switch syncService.syncStatus {
        case .idle: return "Sync: idle"
        case .syncing: return "Sync: syncing"
        case .success: return "Sync: success"
        case .error: return "Sync: error"
        }
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            // Cloud icon
            Image(systemName: "cloud.fill")
                .font(.system(size: 14))
                .foregroundStyle(Color.inkFaint.opacity(0.7))

            // Status dot
            Circle()
                .fill(dotColor)
                .frame(width: 6, height: 6)
                .overlay(
                    Circle()
                        .stroke(Color.paper, lineWidth: 1)
                )
                .offset(x: 2, y: 2)
                .opacity(syncService.syncStatus == .syncing ? syncPulseOpacity : 1.0)
        }
        .accessibilityLabel(statusText)
    }

    // Pulse animation for syncing state
    @State private var syncPulseOpacity: Double = 1.0

    private var animatedBody: some View {
        body
            .onAppear {
                if syncService.syncStatus == .syncing {
                    withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                        syncPulseOpacity = 0.4
                    }
                }
            }
            .onChange(of: syncService.syncStatus) { _, newStatus in
                if newStatus == .syncing {
                    withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                        syncPulseOpacity = 0.4
                    }
                } else {
                    withAnimation(.none) {
                        syncPulseOpacity = 1.0
                    }
                }
            }
    }
}

#Preview {
    VStack(spacing: 20) {
        HStack(spacing: 20) {
            Text("Idle")
            SyncIndicatorView()
        }
    }
    .padding()
    .background(Color.parchment)
}
```

**Step 2: Build the project**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add ios/Trunk/Components/SyncIndicatorView.swift
git commit -m "feat(ios): add SyncIndicatorView component"
```

---

### Task 8: Add sync indicator to GreetingHeader

**Files:**
- Modify: `ios/Trunk/Components/GreetingHeader.swift`

**Step 1: Add SyncIndicatorView to the greeting row**

Replace the body content (starting at the HStack with greeting/name):

```swift
    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space1) {
            HStack(spacing: TrunkTheme.space2) {
                Text(greeting)
                    .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                    .foregroundStyle(Color.inkLight)

                if let name = userName, !name.isEmpty {
                    Text(name)
                        .font(.system(size: TrunkTheme.textLg, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.ink)
                }

                Spacer()

                SyncIndicatorView()
            }

            Rectangle()
                .fill(Color.border)
                .frame(height: 1)

            Text(summaryText)
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
        .padding(.bottom, TrunkTheme.space2)
    }
```

**Step 2: Build the project**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add ios/Trunk/Components/GreetingHeader.swift
git commit -m "feat(ios): add sync indicator to GreetingHeader"
```

---

### Task 9: Update ContentView to use smartSync

**Files:**
- Modify: `ios/Trunk/ContentView.swift`

**Step 1: Replace pullAllEvents with smartSync in syncOnOpen**

Replace the `syncOnOpen` function:

```swift
    private func syncOnOpen() async {
        guard authService.isAuthenticated else { return }

        // Smart sync: incremental if cache valid, full if not
        let result = await SyncService.shared.smartSync()

        if let error = result.error {
            print("Sync failed (\(result.mode.rawValue)): \(error)")
            // Don't do anything else - use cached data as fallback
        } else if result.pulled > 0 {
            print("Synced \(result.pulled) events (\(result.mode.rawValue))")
            progression.refresh()
        } else {
            print("Sync complete, no new events (\(result.mode.rawValue))")
        }

        // Start realtime subscription for instant sync
        SyncService.shared.subscribeToRealtime { _ in
            // Refresh UI when events arrive from other devices
            progression.refresh()
        }
    }
```

**Step 2: Build the project**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add ios/Trunk/ContentView.swift
git commit -m "feat(ios): use smartSync instead of pullAllEvents"
```

---

### Task 10: Remove old pullAllEvents function

**Files:**
- Modify: `ios/Trunk/Services/SyncService.swift`

**Step 1: Delete the old pullAllEvents function**

Remove the entire function:

```swift
    /// Pull ALL events from Supabase (not incremental - we derive state from full log)
    func pullAllEvents() async throws -> Int {
        guard let client = SupabaseClientProvider.shared else {
            throw SyncError.notConfigured
        }

        guard AuthService.shared.isAuthenticated else {
            throw SyncError.notAuthenticated
        }

        let events: [SyncEvent] = try await client
            .from("events")
            .select()
            .order("created_at")
            .execute()
            .value

        // Update EventStore with all events
        await MainActor.run {
            EventStore.shared.setEvents(events)
        }

        return events.count
    }
```

**Step 2: Build the project**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add ios/Trunk/Services/SyncService.swift
git commit -m "refactor(ios): remove unused pullAllEvents function"
```

---

### Task 11: Add pulse animation to SyncIndicatorView

**Files:**
- Modify: `ios/Trunk/Components/SyncIndicatorView.swift`

**Step 1: Update the view to properly implement the pulse animation**

Replace the entire file content:

```swift
//
//  SyncIndicatorView.swift
//  Trunk
//
//  Visual sync status indicator - cloud icon with colored dot.
//  Matches web implementation with traffic light colors.
//

import SwiftUI

struct SyncIndicatorView: View {
    @ObservedObject var syncService = SyncService.shared
    @State private var isPulsing = false

    // Traffic light colors matching web CSS
    private var dotColor: Color {
        switch syncService.syncStatus {
        case .idle:
            return Color(red: 0.533, green: 0.533, blue: 0.533) // #888
        case .syncing:
            return Color(red: 0.902, green: 0.722, blue: 0.0)   // #e6b800
        case .success:
            return Color(red: 0.133, green: 0.647, blue: 0.133) // #22a522
        case .error:
            return Color(red: 0.851, green: 0.325, blue: 0.310) // #d9534f
        }
    }

    private var statusText: String {
        switch syncService.syncStatus {
        case .idle: return "Sync: idle"
        case .syncing: return "Sync: syncing"
        case .success: return "Sync: success"
        case .error: return "Sync: error"
        }
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            // Cloud icon
            Image(systemName: "cloud.fill")
                .font(.system(size: 14))
                .foregroundStyle(Color.inkFaint.opacity(0.7))

            // Status dot
            Circle()
                .fill(dotColor)
                .frame(width: 6, height: 6)
                .overlay(
                    Circle()
                        .stroke(Color.paper, lineWidth: 1)
                )
                .offset(x: 2, y: 2)
                .opacity(syncService.syncStatus == .syncing ? (isPulsing ? 0.4 : 1.0) : 1.0)
        }
        .accessibilityLabel(statusText)
        .onChange(of: syncService.syncStatus) { _, newStatus in
            if newStatus == .syncing {
                withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                    isPulsing = true
                }
            } else {
                withAnimation(.none) {
                    isPulsing = false
                }
            }
        }
        .onAppear {
            if syncService.syncStatus == .syncing {
                withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                    isPulsing = true
                }
            }
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        HStack(spacing: 20) {
            Text("Status indicator")
            SyncIndicatorView()
        }
    }
    .padding()
    .background(Color.parchment)
}
```

**Step 2: Build the project**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add ios/Trunk/Components/SyncIndicatorView.swift
git commit -m "feat(ios): add pulse animation to sync indicator"
```

---

### Task 12: Final build and test

**Step 1: Clean build**

Run: `cd ios && xcodebuild -scheme Trunk -destination 'platform=iOS Simulator,name=iPhone 16' clean build | grep -E '(error:|warning:|BUILD)'`
Expected: BUILD SUCCEEDED

**Step 2: Run the app in simulator and verify**

1. Open Xcode and run the app
2. Log in with your account
3. Verify cloud indicator shows yellow (syncing) then green (success)
4. Check Xcode console: should say "Synced X events (incremental)" or "no new events (incremental)"

**Step 3: Test full sync (cache invalidation)**

1. In simulator, go to Settings > Apps > Trunk > Clear Data (or delete app)
2. Relaunch app and log in
3. Check console: should say "Synced X events (full)"

**Step 4: Commit any fixes if needed**

---

### Task 13: Final commit summary

**Step 1: Verify git status**

Run: `git status`
Expected: All changes committed

**Step 2: Create summary commit if any uncommitted changes**

```bash
git add -A
git commit -m "chore(ios): final cleanup for sync service overhaul"
```
