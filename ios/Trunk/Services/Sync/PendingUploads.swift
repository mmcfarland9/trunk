//
//  PendingUploads.swift
//  Trunk
//
//  Pending upload retry logic for sync service.
//

import Foundation
import Supabase

// REVIEW: Pending events persisted to UserDefaults. Alternative: file-based storage or CoreData.
// UserDefaults chosen for simplicity.
private let pendingEventsStorageKey = "trunk-pending-events-for-reauth"

extension SyncService {

  // MARK: - Pending Event Persistence (survives re-auth)

  /// Save pending events to UserDefaults before cache clear so they survive re-auth
  func savePendingEventsForReauth() {
    let pending = EventStore.shared.pendingEvents
    guard !pending.isEmpty else {
      UserDefaults.standard.removeObject(forKey: pendingEventsStorageKey)
      return
    }

    do {
      let data = try JSONEncoder().encode(pending)
      UserDefaults.standard.set(data, forKey: pendingEventsStorageKey)
      print("Sync: Saved \(pending.count) pending events for re-auth recovery")
    } catch {
      print("Sync: Failed to save pending events — \(error.localizedDescription)")
    }
  }

  /// Restore pending events from UserDefaults after re-auth
  func restorePendingEvents() {
    guard let data = UserDefaults.standard.data(forKey: pendingEventsStorageKey) else { return }

    do {
      let events = try JSONDecoder().decode([SyncEvent].self, from: data)
      for event in events {
        // Only restore if not already present
        let exists = EventStore.shared.events.contains { $0.clientId == event.clientId }
        if !exists {
          EventStore.shared.appendEvent(event)
          EventStore.shared.markPendingUpload(clientId: event.clientId)
        }
      }
      UserDefaults.standard.removeObject(forKey: pendingEventsStorageKey)
      print("Sync: Restored \(events.count) pending events after re-auth")
    } catch {
      print("Sync: Failed to restore pending events — \(error.localizedDescription)")
    }
  }

  // MARK: - Retry Pending Uploads

  /// Retry pushing all pending events that failed previously.
  /// Returns the number of events successfully pushed.
  func retryPendingUploads() async -> Int {
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
        // Handle duplicate key (23505) as success — event was already on server
        if error.localizedDescription.contains("23505") || error.localizedDescription.contains("duplicate key") {
          EventStore.shared.markConfirmed(clientId: event.clientId)
          pushed += 1
        } else {
          // Leave as pending — will retry next cycle
          print("Sync: Failed to retry pending event \(event.clientId) — \(error.localizedDescription)")
        }
      }
    }

    return pushed
  }
}
