//
//  SyncService.swift
//  Trunk
//
//  Cloud sync service for push/pull events via Supabase.
//

import Foundation
import SwiftData
import Supabase
import Realtime

@MainActor
final class SyncService {
    static let shared = SyncService()

    private let lastSyncKey = "trunk-last-sync"
    private var realtimeChannel: RealtimeChannelV2?
    private var onRealtimeEvent: ((SyncEvent) -> Void)?

    private init() {}

    /// Pull events from Supabase since last sync
    func pullEvents(modelContext: ModelContext) async throws -> Int {
        guard let client = SupabaseClientProvider.shared else {
            throw SyncError.notConfigured
        }

        guard AuthService.shared.isAuthenticated else {
            throw SyncError.notAuthenticated
        }

        let lastSync = UserDefaults.standard.string(forKey: lastSyncKey)

        let events: [SyncEvent]
        if let lastSync {
            events = try await client
                .from("events")
                .select()
                .gt("created_at", value: lastSync)
                .order("created_at")
                .execute()
                .value
        } else {
            events = try await client
                .from("events")
                .select()
                .order("created_at")
                .execute()
                .value
        }

        guard !events.isEmpty else { return 0 }

        // Apply events to local models
        for event in events {
            try applyEvent(event, to: modelContext)
        }

        // Save last sync timestamp
        if let latest = events.last?.createdAt {
            UserDefaults.standard.set(latest, forKey: lastSyncKey)
        }

        try modelContext.save()

        return events.count
    }

    /// Push a single event to Supabase
    func pushEvent(type: String, payload: [String: Any]) async throws {
        guard let client = SupabaseClientProvider.shared else {
            throw SyncError.notConfigured
        }

        guard let userId = AuthService.shared.user?.id else {
            throw SyncError.notAuthenticated
        }

        let clientId = "\(ISO8601DateFormatter().string(from: Date()))-\(randomString(length: 6))"
        let clientTimestamp = ISO8601DateFormatter().string(from: Date())

        let event = SyncEventInsert(
            userId: userId.uuidString,
            type: type,
            payload: payload.mapValues { AnyCodable($0) },
            clientId: clientId,
            clientTimestamp: clientTimestamp
        )

        try await client
            .from("events")
            .insert(event)
            .execute()
    }

    /// Apply a sync event to local SwiftData models
    private func applyEvent(_ event: SyncEvent, to context: ModelContext) throws {
        switch event.type {
        case "sprout_planted":
            try applySproutPlanted(event.payload, to: context)
        case "sprout_watered":
            try applySproutWatered(event.payload, to: context)
        case "sprout_harvested":
            try applySproutHarvested(event.payload, to: context)
        case "sprout_uprooted":
            try applySproutUprooted(event.payload, to: context)
        case "sun_shone":
            try applySunShone(event.payload, to: context)
        case "leaf_created":
            try applyLeafCreated(event.payload, to: context)
        default:
            print("Unknown event type: \(event.type)")
        }
    }

    // MARK: - Event Application

    private func applySproutPlanted(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let sproutId = payload["sproutId"]?.value as? String,
              let title = payload["title"]?.value as? String,
              let nodeId = payload["twigId"]?.value as? String,
              let seasonRaw = payload["season"]?.value as? String,
              let environmentRaw = payload["environment"]?.value as? String else {
            return
        }

        // Get soil cost (could be Int or Double from JSON)
        let soilCost: Int
        if let intCost = payload["soilCost"]?.value as? Int {
            soilCost = intCost
        } else if let doubleCost = payload["soilCost"]?.value as? Double {
            soilCost = Int(doubleCost)
        } else {
            return
        }

        // Check if sprout already exists
        let descriptor = FetchDescriptor<Sprout>(predicate: #Predicate { $0.sproutId == sproutId })
        let existing = try context.fetch(descriptor)
        guard existing.isEmpty else { return }

        let season = Season(rawValue: seasonRaw) ?? .oneMonth
        let environment = SproutEnvironment(rawValue: environmentRaw) ?? .firm

        let sprout = Sprout(
            sproutId: sproutId,
            title: title,
            season: season,
            environment: environment,
            nodeId: nodeId,
            soilCost: soilCost
        )

        if let leafId = payload["leafId"]?.value as? String {
            sprout.leafId = leafId
        }

        context.insert(sprout)
    }

    private func applySproutWatered(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let sproutId = payload["sproutId"]?.value as? String,
              let content = payload["note"]?.value as? String,
              let timestamp = payload["timestamp"]?.value as? String else {
            return
        }

        let descriptor = FetchDescriptor<Sprout>(predicate: #Predicate { $0.sproutId == sproutId })
        guard let sprout = try context.fetch(descriptor).first else { return }

        let entry = WaterEntry(content: content)
        if let date = ISO8601DateFormatter().date(from: timestamp) {
            entry.timestamp = date
        }
        entry.sprout = sprout
        context.insert(entry)
    }

    private func applySproutHarvested(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let sproutId = payload["sproutId"]?.value as? String else {
            return
        }

        // Get result (could be Int or Double from JSON)
        let result: Int
        if let intResult = payload["result"]?.value as? Int {
            result = intResult
        } else if let doubleResult = payload["result"]?.value as? Double {
            result = Int(doubleResult)
        } else {
            return
        }

        let descriptor = FetchDescriptor<Sprout>(predicate: #Predicate { $0.sproutId == sproutId })
        guard let sprout = try context.fetch(descriptor).first else { return }

        sprout.harvest(result: result)
    }

    private func applySproutUprooted(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let sproutId = payload["sproutId"]?.value as? String else {
            return
        }

        let descriptor = FetchDescriptor<Sprout>(predicate: #Predicate { $0.sproutId == sproutId })
        guard let sprout = try context.fetch(descriptor).first else { return }

        // Delete the uprooted sprout
        context.delete(sprout)
    }

    private func applySunShone(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let twigId = payload["twigId"]?.value as? String,
              let content = payload["note"]?.value as? String,
              let timestamp = payload["timestamp"]?.value as? String else {
            return
        }

        let twigLabel = payload["twigLabel"]?.value as? String ?? ""

        let entry = SunEntry(content: content, twigId: twigId, twigLabel: twigLabel)
        if let date = ISO8601DateFormatter().date(from: timestamp) {
            entry.timestamp = date
        }
        context.insert(entry)
    }

    private func applyLeafCreated(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let leafId = payload["leafId"]?.value as? String,
              let name = payload["name"]?.value as? String,
              let nodeId = payload["twigId"]?.value as? String else {
            return
        }

        // Check if leaf already exists
        let descriptor = FetchDescriptor<Leaf>(predicate: #Predicate { $0.id == leafId })
        let existing = try context.fetch(descriptor)
        guard existing.isEmpty else { return }

        let leaf = Leaf(id: leafId, name: name, nodeId: nodeId)
        context.insert(leaf)
    }

    // MARK: - Realtime

    /// Subscribe to realtime events from other devices
    func subscribeToRealtime(modelContext: ModelContext, onEvent: @escaping (SyncEvent) -> Void) {
        guard let client = SupabaseClientProvider.shared else { return }
        guard let userId = AuthService.shared.user?.id else { return }

        onRealtimeEvent = onEvent

        // Unsubscribe from existing channel
        unsubscribeFromRealtime()

        Task {
            do {
                let channel = client.realtimeV2.channel("events-realtime")

                let insertions = channel.postgresChange(InsertAction.self, table: "events", filter: .eq("user_id", value: userId.uuidString))

                try await channel.subscribe()

                for await insertion in insertions {
                    do {
                        let event = try insertion.decodeRecord(as: SyncEvent.self, decoder: JSONDecoder())

                        // Apply the event to local models
                        try applyEvent(event, to: modelContext)
                        try modelContext.save()

                        onRealtimeEvent?(event)
                        print("Realtime: received event from another device - \(event.type)")
                    } catch {
                        print("Realtime: failed to decode event - \(error)")
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
