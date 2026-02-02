//
//  SyncService.swift
//  Trunk
//
//  Cloud sync service for push/pull events via Supabase.
//

import Foundation
import SwiftData

@MainActor
final class SyncService {
    static let shared = SyncService()

    private let lastSyncKey = "trunk-last-sync"

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

        var query = client
            .from("events")
            .select()
            .order("created_at")

        if let lastSync {
            query = query.gt("created_at", value: lastSync)
        }

        let events: [SyncEvent] = try await query.execute().value

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
            // Create sprout from payload
            try applySproutPlanted(event.payload, to: context)
        case "sprout_watered":
            // Add water entry
            try applySproutWatered(event.payload, to: context)
        case "sprout_harvested":
            // Update sprout result
            try applySproutHarvested(event.payload, to: context)
        case "sprout_uprooted":
            // Mark sprout as uprooted
            try applySproutUprooted(event.payload, to: context)
        case "sun_shone":
            // Add sun entry
            try applySunShone(event.payload, to: context)
        case "leaf_created":
            // Create leaf
            try applyLeafCreated(event.payload, to: context)
        default:
            print("Unknown event type: \(event.type)")
        }
    }

    // MARK: - Event Application

    private func applySproutPlanted(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let id = (payload["sproutId"]?.value as? String).flatMap({ UUID(uuidString: $0) }),
              let title = payload["title"]?.value as? String,
              let twigId = payload["twigId"]?.value as? String,
              let season = payload["season"]?.value as? String,
              let environment = payload["environment"]?.value as? String,
              let soilCost = payload["soilCost"]?.value as? Double else {
            return
        }

        // Check if sprout already exists
        let descriptor = FetchDescriptor<Sprout>(predicate: #Predicate { $0.id == id })
        let existing = try context.fetch(descriptor)
        guard existing.isEmpty else { return }

        let sprout = Sprout(
            id: id,
            title: title,
            twigId: twigId,
            season: Sprout.Season(rawValue: season) ?? .oneMonth,
            environment: Sprout.Environment(rawValue: environment) ?? .firm,
            soilCost: soilCost
        )

        if let leafId = (payload["leafId"]?.value as? String).flatMap({ UUID(uuidString: $0) }) {
            sprout.leafId = leafId
        }

        context.insert(sprout)
    }

    private func applySproutWatered(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let sproutIdStr = payload["sproutId"]?.value as? String,
              let sproutId = UUID(uuidString: sproutIdStr),
              let note = payload["note"]?.value as? String,
              let timestamp = payload["timestamp"]?.value as? String else {
            return
        }

        let descriptor = FetchDescriptor<Sprout>(predicate: #Predicate { $0.id == sproutId })
        guard let sprout = try context.fetch(descriptor).first else { return }

        let entry = WaterEntry(note: note)
        if let date = ISO8601DateFormatter().date(from: timestamp) {
            entry.timestamp = date
        }
        entry.sprout = sprout
        context.insert(entry)
    }

    private func applySproutHarvested(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let sproutIdStr = payload["sproutId"]?.value as? String,
              let sproutId = UUID(uuidString: sproutIdStr),
              let result = payload["result"]?.value as? Int else {
            return
        }

        let descriptor = FetchDescriptor<Sprout>(predicate: #Predicate { $0.id == sproutId })
        guard let sprout = try context.fetch(descriptor).first else { return }

        sprout.result = result
        sprout.state = .completed
    }

    private func applySproutUprooted(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let sproutIdStr = payload["sproutId"]?.value as? String,
              let sproutId = UUID(uuidString: sproutIdStr) else {
            return
        }

        let descriptor = FetchDescriptor<Sprout>(predicate: #Predicate { $0.id == sproutId })
        guard let sprout = try context.fetch(descriptor).first else { return }

        sprout.state = .failed
    }

    private func applySunShone(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let twigId = payload["twigId"]?.value as? String,
              let note = payload["note"]?.value as? String,
              let timestamp = payload["timestamp"]?.value as? String else {
            return
        }

        let entry = SunEntry(twigId: twigId, note: note)
        if let date = ISO8601DateFormatter().date(from: timestamp) {
            entry.timestamp = date
        }
        context.insert(entry)
    }

    private func applyLeafCreated(_ payload: [String: AnyCodable], to context: ModelContext) throws {
        guard let idStr = payload["leafId"]?.value as? String,
              let id = UUID(uuidString: idStr),
              let name = payload["name"]?.value as? String,
              let twigId = payload["twigId"]?.value as? String else {
            return
        }

        // Check if leaf already exists
        let descriptor = FetchDescriptor<Leaf>(predicate: #Predicate { $0.id == id })
        let existing = try context.fetch(descriptor)
        guard existing.isEmpty else { return }

        let leaf = Leaf(id: id, name: name, twigId: twigId)
        context.insert(leaf)
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
