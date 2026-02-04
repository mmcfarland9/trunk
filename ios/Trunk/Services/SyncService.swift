//
//  SyncService.swift
//  Trunk
//
//  Cloud sync service for push/pull events via Supabase.
//

import Foundation
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
final class SyncService {
    static let shared = SyncService()

    private var realtimeChannel: RealtimeChannelV2?
    private var onRealtimeEvent: ((SyncEvent) -> Void)?

    private init() {}

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

    /// Push a single event to Supabase and update local EventStore
    func pushEvent(type: String, payload: [String: Any]) async throws {
        guard let client = SupabaseClientProvider.shared else {
            throw SyncError.notConfigured
        }

        guard let userId = AuthService.shared.user?.id else {
            throw SyncError.notAuthenticated
        }

        let clientId = "\(ISO8601DateFormatter().string(from: Date()))-\(randomString(length: 6))"
        let clientTimestamp = ISO8601DateFormatter().string(from: Date())

        let eventInsert = SyncEventInsert(
            userId: userId.uuidString,
            type: type,
            payload: payload.mapValues { AnyCodable($0) },
            clientId: clientId,
            clientTimestamp: clientTimestamp
        )

        // Push to cloud and get returned event with server-generated fields
        let response: [SyncEvent] = try await client
            .from("events")
            .insert(eventInsert)
            .select()
            .execute()
            .value

        // Append returned event to local store
        if let event = response.first {
            await MainActor.run {
                EventStore.shared.appendEvent(event)
            }
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

                let insertions = channel.postgresChange(InsertAction.self, table: "events", filter: .eq("user_id", value: userId.uuidString))

                try await channel.subscribe()

                for await insertion in insertions {
                    do {
                        let event = try insertion.decodeRecord(as: SyncEvent.self, decoder: JSONDecoder())

                        // Append to local EventStore
                        await MainActor.run {
                            EventStore.shared.appendEvent(event)
                        }

                        onRealtimeEvent?(event)
                        print("Realtime: received event - \(event.type)")
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
        return String((0..<length).map { _ in letters.randomElement()! })
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
