//
//  PendingUploads.swift
//  Trunk
//
//  Pending upload retry logic for sync service.
//

import Foundation
import Supabase

extension SyncService {

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
        // Leave as pending — will retry next cycle
        print("Sync: Failed to retry pending event \(event.clientId) — \(error.localizedDescription)")
      }
    }

    return pushed
  }
}
