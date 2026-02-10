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

enum DetailedSyncStatus: String {
  case synced         // All events confirmed, no pending, last check found nothing new
  case syncing        // Currently pulling/pushing
  case pendingUpload  // Has local events not yet pushed
  case offline        // Last sync attempt failed
  case loading        // No cache, first sync in progress
}

enum SyncMode: String {
  case incremental
  case full
}

struct SyncResult {
  let status: SyncStatus
  let pulled: Int
  let pushed: Int
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
  @Published private(set) var detailedSyncStatus: DetailedSyncStatus = .loading
  @Published private(set) var lastConfirmedTimestamp: String? = nil

  private var realtimeChannel: RealtimeChannelV2?
  private var onRealtimeEvent: ((SyncEvent) -> Void)?
  private var hasCompletedInitialSync = false

  private init() {}

  /// Reset sync status when sync is not applicable (e.g., not authenticated
  /// or Supabase not configured). Prevents the icon from showing amber
  /// indefinitely in local-only mode.
  func markNotNeeded() {
    syncStatus = .idle
    detailedSyncStatus = .synced
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

  /// Update lastConfirmedTimestamp from EventStore
  private func refreshLastConfirmedTimestamp() {
    lastConfirmedTimestamp = EventStore.shared.lastConfirmedTimestamp
  }

  /// Recompute detailedSyncStatus based on current state
  private func updateDetailedStatus() {
    if syncStatus == .syncing {
      detailedSyncStatus = .syncing
    } else if syncStatus == .error && !hasCompletedInitialSync {
      detailedSyncStatus = .loading
    } else if syncStatus == .error {
      detailedSyncStatus = .offline
    } else if EventStore.shared.hasPendingUploads {
      detailedSyncStatus = .pendingUpload
    } else {
      detailedSyncStatus = .synced
    }
  }

  // MARK: - Retry Pending Uploads

  /// Retry pushing all pending events that failed previously.
  /// Returns the number of events successfully pushed.
  private func retryPendingUploads() async -> Int {
    let pending = EventStore.shared.pendingEvents
    guard !pending.isEmpty else { return 0 }

    guard let client = SupabaseClientProvider.shared else { return 0 }

    var pushed = 0
    for event in pending {
      let eventInsert = SyncEventInsert(
        userId: event.userId.uuidString,
        type: event.type,
        payload: event.payload,
        clientId: event.clientId,
        clientTimestamp: event.clientTimestamp
      )

      do {
        let _: [SyncEvent] = try await client
          .from("events")
          .insert(eventInsert)
          .select()
          .execute()
          .value
        EventStore.shared.markConfirmed(clientId: event.clientId)
        pushed += 1
      } catch {
        // Leave as pending — will retry next cycle
        print("Sync: Failed to retry pending event \(event.clientId) — \(error.localizedDescription)")
      }
    }

    return pushed
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
        EventStore.shared.appendEvents(uniqueNewEvents)
      }

      // Server-pulled events with matching clientId are now confirmed
      for event in syncEvents {
        EventStore.shared.markConfirmed(clientId: event.clientId)
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
  /// Retries pending uploads before pulling. Uses cached data as fallback if network fails.
  func smartSync() async -> SyncResult {
    guard SupabaseClientProvider.shared != nil else {
      return SyncResult(status: .error, pulled: 0, pushed: 0, error: "Supabase not configured", mode: .full)
    }

    guard AuthService.shared.isAuthenticated else {
      return SyncResult(status: .error, pulled: 0, pushed: 0, error: "Not authenticated", mode: .full)
    }

    syncStatus = .syncing
    updateDetailedStatus()

    // 1. Retry any pending uploads first
    let pushed = await retryPendingUploads()

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
          updateDetailedStatus()
          return SyncResult(status: .error, pulled: 0, pushed: pushed, error: "Supabase not configured", mode: mode)
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
        hasCompletedInitialSync = true
        updateDetailedStatus()
        refreshLastConfirmedTimestamp()
        return SyncResult(status: .error, pulled: 0, pushed: pushed, error: error, mode: mode)
      }

      // Update cache version on successful incremental sync too
      if cacheValid && result.pulled > 0 {
        setCacheVersion()
      }

      syncStatus = .success
      hasCompletedInitialSync = true
      refreshLastConfirmedTimestamp()
      updateDetailedStatus()

      let pendingRemaining = EventStore.shared.pendingUploadCount
      print("Sync: Fetched \(result.pulled) remote changes, pushed \(pushed) local changes, \(pendingRemaining) pending uploads remaining.")

      return SyncResult(status: .success, pulled: result.pulled, pushed: pushed, error: nil, mode: mode)

    } catch {
      // Network error - use cached data as fallback
      print("Sync exception, using cached data: \(error)")
      syncStatus = .error
      hasCompletedInitialSync = true
      refreshLastConfirmedTimestamp()
      updateDetailedStatus()
      return SyncResult(status: .error, pulled: 0, pushed: pushed, error: error.localizedDescription, mode: mode)
    }
  }

  /// Clear local cache (events and sync timestamp)
  /// Used to ensure cloud is always source of truth
  func clearLocalCache() {
    clearLastSync()
    clearCacheVersion()
    EventStore.shared.clearEvents()
    hasCompletedInitialSync = false
    lastConfirmedTimestamp = nil
    updateDetailedStatus()
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
  /// action without waiting for a network round-trip. On failure the event
  /// is queued for retry instead of being rolled back.
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
    updateDetailedStatus()

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
    EventStore.shared.markPendingUpload(clientId: clientId)

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
      // Server confirmed — mark as confirmed
      EventStore.shared.markConfirmed(clientId: clientId)
      syncStatus = .success
      refreshLastConfirmedTimestamp()
      updateDetailedStatus()
    } catch {
      // Keep the event in the store — it will be retried on next sync cycle
      print("Sync: Push failed for event \(clientId), queued for retry — \(error.localizedDescription)")
      syncStatus = .error
      updateDetailedStatus()
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

        try await channel.subscribeWithError()

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
            } else {
              // If we have this event as pending, mark it as confirmed
              // (the server just acknowledged it via realtime)
              await MainActor.run {
                EventStore.shared.markConfirmed(clientId: event.clientId)
                refreshLastConfirmedTimestamp()
                updateDetailedStatus()
              }
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
