//
//  SyncService.swift
//  Trunk
//
//  Cloud sync service for push/pull events via Supabase.
//

import Foundation
import Combine
import Supabase
import Realtime

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

@MainActor
final class SyncService: ObservableObject {
    static let shared = SyncService()

    @Published private(set) var syncStatus: SyncStatus = .syncing

    private var realtimeChannel: RealtimeChannelV2?
    private var onRealtimeEvent: ((SyncEvent) -> Void)?

    private init() {}

    /// Reset sync status when sync is not applicable (e.g., not authenticated
    /// or Supabase not configured). Prevents the icon from showing amber
    /// indefinitely in local-only mode.
    func markNotNeeded() {
        syncStatus = .idle
    }

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

        let syncEvents: [SyncEvent]
        if let lastSync = lastSync {
            syncEvents = try await client
                .from("events")
                .select()
                .gt("created_at", value: lastSync)
                .order("created_at")
                .execute()
                .value
        } else {
            syncEvents = try await client
                .from("events")
                .select()
                .order("created_at")
                .execute()
                .value
        }

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

    /// Clear local cache (events and sync timestamp)
    /// Used to ensure cloud is always source of truth
    func clearLocalCache() {
        clearLastSync()
        clearCacheVersion()
        EventStore.shared.clearEvents()
    }

    /// Force a full sync by invalidating cache and re-pulling everything.
    /// Use for pull-to-refresh to pick up server-side changes (e.g. deleted rows).
    func forceFullSync() async -> SyncResult {
        clearLastSync()
        clearCacheVersion()
        return await smartSync()
    }

    /// Push a single event to Supabase with optimistic local-first update.
    /// The local EventStore is updated immediately so the UI reflects the
    /// action without waiting for a network round-trip. The cloud push
    /// happens in the background; on failure the optimistic event is rolled
    /// back and the error is thrown.
    func pushEvent(type: String, payload: [String: Any]) async throws {
        guard let client = SupabaseClientProvider.shared else {
            throw SyncError.notConfigured
        }

        guard let userId = AuthService.shared.user?.id else {
            throw SyncError.notAuthenticated
        }

        let clientId = "\(ISO8601DateFormatter().string(from: Date()))-\(randomString(length: 6))"
        let clientTimestamp = ISO8601DateFormatter().string(from: Date())

        syncStatus = .syncing

        // 1. Optimistic local update — user sees the result immediately
        let optimisticEvent = SyncEvent(
            id: UUID(),
            userId: userId,
            type: type,
            payload: payload.mapValues { AnyCodable($0) },
            clientId: clientId,
            clientTimestamp: clientTimestamp,
            createdAt: clientTimestamp // placeholder until server confirms
        )
        EventStore.shared.appendEvent(optimisticEvent)

        // 2. Push to cloud in background
        let eventInsert = SyncEventInsert(
            userId: userId.uuidString,
            type: type,
            payload: payload.mapValues { AnyCodable($0) },
            clientId: clientId,
            clientTimestamp: clientTimestamp
        )

        do {
            let _: [SyncEvent] = try await client
                .from("events")
                .insert(eventInsert)
                .select()
                .execute()
                .value
            // Server confirmed — the optimistic event stays in the store.
            // On next sync, dedup by clientTimestamp prevents duplicates.
            syncStatus = .success
        } catch {
            // Rollback the optimistic event so state is consistent
            EventStore.shared.removeEvent(withClientId: clientId)
            syncStatus = .error
            throw error
        }
    }

    // MARK: - Realtime

    /// Subscribe to realtime events from other devices
    func subscribeToRealtime(onEvent: @escaping (SyncEvent) -> Void) {
        guard let client = SupabaseClientProvider.shared else { return }
        guard let userId = AuthService.shared.user?.id else { return }

        onRealtimeEvent = onEvent
        unsubscribeFromRealtime()

        Task {
            do {
                let channel = client.realtimeV2.channel("events-realtime")
                self.realtimeChannel = channel

                let insertions = channel.postgresChange(InsertAction.self, table: "events", filter: .eq("user_id", value: userId.uuidString))

                try await channel.subscribe()

                for await insertion in insertions {
                    do {
                        let event = try insertion.decodeRecord(as: SyncEvent.self, decoder: JSONDecoder())

                        // Dedup: skip if we already have this event (e.g. we pushed it ourselves)
                        let isDuplicate = await MainActor.run {
                            EventStore.shared.events.contains { $0.clientTimestamp == event.clientTimestamp }
                        }

                        if !isDuplicate {
                            await MainActor.run {
                                EventStore.shared.appendEvent(event)
                            }
                            onRealtimeEvent?(event)
                            print("Realtime: received event from another device - \(event.type)")
                        }
                    } catch {
                        print("Realtime: failed to decode - \(error)")
                    }
                }
            } catch {
                print("Realtime: failed to subscribe - \(error)")
            }
        }
    }

    /// Unsubscribe from realtime events
    func unsubscribeFromRealtime() {
        if let channel = realtimeChannel {
            Task {
                await channel.unsubscribe()
            }
            realtimeChannel = nil
            print("Realtime: disconnected")
        }
        onRealtimeEvent = nil
    }

    // MARK: - Helpers

    private func randomString(length: Int) -> String {
        let letters = "abcdefghijklmnopqrstuvwxyz0123456789"
        return String((0..<length).compactMap { _ in letters.randomElement() })
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
