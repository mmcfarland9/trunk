//
//  SyncOperations.swift
//  Trunk
//
//  Core sync operations: pullEvents, smartSync, forceFullSync, pushEvent, clearLocalCache.
//

import Foundation
import Supabase

extension SyncService {

  // MARK: - Sync Operations

  /// Pull events since last sync (incremental)
  func pullEvents() async throws -> (pulled: Int, error: String?) {
    guard let client = SupabaseClientProvider.shared else {
      return (0, "Supabase not configured")
    }

    guard AuthService.shared.isAuthenticated else {
      return (0, "Not authenticated")
    }

    // Defense-in-depth: filter by user_id even though RLS is enabled
    guard let userId = AuthService.shared.user?.id else {
      return (0, "Not authenticated")
    }

    let lastSync = getLastSync()

    let syncEvents: [SyncEvent]
    if let lastSync = lastSync {
      syncEvents = try await withTimeout(seconds: 15) { [client] in
        try await client
          .from("events")
          .select()
          .eq("user_id", value: userId.uuidString)
          .gt("created_at", value: lastSync)
          .order("created_at")
          .execute()
          .value
      }
    } else {
      syncEvents = try await withTimeout(seconds: 15) { [client] in
        try await client
          .from("events")
          .select()
          .eq("user_id", value: userId.uuidString)
          .order("created_at")
          .execute()
          .value
      }
    }

    if !syncEvents.isEmpty {
      // Merge with existing events, avoiding duplicates by client_id
      let existingClientIds = Set(EventStore.shared.events.map { $0.clientId })
      let uniqueNewEvents = syncEvents.filter { !existingClientIds.contains($0.clientId) }

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

    // Guard against concurrent sync — if already syncing, return early
    guard syncStatus != .syncing else {
      return SyncResult(status: .syncing, pulled: 0, pushed: 0, error: nil, mode: .incremental)
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

        // Defense-in-depth: filter by user_id even though RLS is enabled
        guard let userId = AuthService.shared.user?.id else {
          syncStatus = .error
          updateDetailedStatus()
          return SyncResult(status: .error, pulled: 0, pushed: pushed, error: "Not authenticated", mode: mode)
        }

        let syncEvents: [SyncEvent] = try await withTimeout(seconds: 15) { [client] in
          try await client
            .from("events")
            .select()
            .eq("user_id", value: userId.uuidString)
            .order("created_at")
            .execute()
            .value
        }

        // Success - now safe to replace cache
        EventStore.shared.setEvents(syncEvents)
        setCacheVersion()

        if let latest = syncEvents.last?.createdAt {
          setLastSync(latest)
        } else {
          // Server returned no events — clear stale timestamp so future
          // incremental syncs don't silently skip a full refresh.
          clearLastSync()
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
      restorePendingEvents()
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
    savePendingEventsForReauth()
    clearLastSync()
    clearCacheVersion()
    EventStore.shared.clearEvents()
    hasCompletedInitialSync = false
    lastConfirmedTimestamp = nil
    updateDetailedStatus()
  }

  /// Force a full sync by invalidating cache and re-pulling everything.
  /// Use for pull-to-refresh to pick up server-side changes (e.g. deleted rows).
  ///
  /// Resets `syncStatus` so this always runs even if a background sync is
  /// in progress — pull-to-refresh is an explicit user action that should
  /// supersede any concurrent incremental sync.
  func forceFullSync() async -> SyncResult {
    syncStatus = .idle
    clearLastSync()
    clearCacheVersion()
    return await smartSync()
  }

  /// Push a single event to Supabase with optimistic local-first update.
  /// The local EventStore is updated immediately so the UI reflects the
  /// action without waiting for a network round-trip. On failure the event
  /// is queued for retry instead of being rolled back.
  func pushEvent(type: String, payload: [String: JSONValue]) async throws {
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
      payload: payload,
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
      payload: payload,
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
      // Handle Supabase duplicate key error (23505) as success — the event
      // was already inserted (e.g. response was lost on a previous attempt)
      if error.localizedDescription.contains("23505") || error.localizedDescription.contains("duplicate key") {
        EventStore.shared.markConfirmed(clientId: clientId)
        syncStatus = .success
        refreshLastConfirmedTimestamp()
        updateDetailedStatus()
        return
      }
      // Keep the event in the store — it will be retried on next sync cycle
      print("Sync: Push failed for event \(clientId), queued for retry — \(error.localizedDescription)")
      syncStatus = .error
      updateDetailedStatus()
      throw error
    }
  }
}
