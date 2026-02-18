//
//  SyncRealtime.swift
//  Trunk
//
//  Realtime subscription management for sync service.
//

import Foundation
import Supabase
import Realtime

extension SyncService {

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
              EventStore.shared.events.contains { $0.clientId == event.clientId }
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
}
