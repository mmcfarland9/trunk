//
//  DataExportService.swift
//  Trunk
//
//  Export and import data in v4 event-sourced format.
//  Compatible with web app's export format.
//

import Foundation

// MARK: - Event Types (match web src/events/types.ts)

enum TrunkEventType: String, Codable {
    case sproutPlanted = "sprout_planted"
    case sproutWatered = "sprout_watered"
    case sproutHarvested = "sprout_harvested"
    case sproutUprooted = "sprout_uprooted"
    case sunShone = "sun_shone"
    case leafCreated = "leaf_created"
}

struct TrunkEvent: Codable {
    let type: TrunkEventType
    let timestamp: String

    // All optional fields (flat structure for JSON encoding)
    var sproutId: String?
    var twigId: String?
    var title: String?
    var season: String?
    var environment: String?
    var soilCost: Int?
    var leafId: String?
    var bloomWither: String?
    var bloomBudding: String?
    var bloomFlourish: String?
    var content: String?
    var prompt: String?
    var result: Int?
    var reflection: String?
    var capacityGained: Double?
    var soilReturned: Int?
    var twigLabel: String?
    var name: String?

    // MARK: - Factory methods for creating specific event types

    static func leafCreated(timestamp: String, leafId: String, twigId: String, name: String) -> TrunkEvent {
        TrunkEvent(type: .leafCreated, timestamp: timestamp, twigId: twigId, leafId: leafId, name: name)
    }

    static func sproutPlanted(
        timestamp: String,
        sproutId: String,
        twigId: String,
        title: String,
        season: String,
        environment: String,
        soilCost: Int,
        leafId: String?,
        bloomWither: String?,
        bloomBudding: String?,
        bloomFlourish: String?
    ) -> TrunkEvent {
        TrunkEvent(
            type: .sproutPlanted,
            timestamp: timestamp,
            sproutId: sproutId,
            twigId: twigId,
            title: title,
            season: season,
            environment: environment,
            soilCost: soilCost,
            leafId: leafId,
            bloomWither: bloomWither,
            bloomBudding: bloomBudding,
            bloomFlourish: bloomFlourish
        )
    }

    static func sproutWatered(timestamp: String, sproutId: String, content: String, prompt: String?) -> TrunkEvent {
        TrunkEvent(type: .sproutWatered, timestamp: timestamp, sproutId: sproutId, content: content, prompt: prompt)
    }

    static func sproutHarvested(timestamp: String, sproutId: String, result: Int, reflection: String?, capacityGained: Double) -> TrunkEvent {
        TrunkEvent(type: .sproutHarvested, timestamp: timestamp, sproutId: sproutId, result: result, reflection: reflection, capacityGained: capacityGained)
    }

    static func sunShone(timestamp: String, twigId: String, twigLabel: String, content: String, prompt: String?) -> TrunkEvent {
        TrunkEvent(type: .sunShone, timestamp: timestamp, twigId: twigId, content: content, prompt: prompt, twigLabel: twigLabel)
    }
}

struct CircleData: Codable {
    var label: String?
    var note: String?
}

struct ExportSettings: Codable {
    var name: String?
}

struct ExportPayload: Codable {
    let version: Int
    let exportedAt: String
    let events: [TrunkEvent]
    let circles: [String: CircleData]
    let settings: ExportSettings
}

// MARK: - DataExportService

struct DataExportService {

    // MARK: - Export

    /// Generate v4 export payload from EventStore events
    static func generateExport(events: [SyncEvent]) -> ExportPayload {
        // Convert SyncEvents to TrunkEvents for export
        let trunkEvents = events.compactMap { syncEvent -> TrunkEvent? in
            convertSyncEventToTrunkEvent(syncEvent)
        }

        return ExportPayload(
            version: 4,
            exportedAt: isoString(Date()),
            events: trunkEvents,
            circles: [:], // Pure cloud architecture - no custom labels stored locally
            settings: ExportSettings(name: nil)
        )
    }

    /// Convert export payload to JSON data
    static func exportToJSON(_ payload: ExportPayload) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(payload)
    }

    // MARK: - Import

    /// Parse JSON data into export payload
    static func parseImport(_ data: Data) throws -> ExportPayload {
        let decoder = JSONDecoder()
        return try decoder.decode(ExportPayload.self, from: data)
    }

    // MARK: - Event Conversion

    /// Convert a SyncEvent to TrunkEvent for export
    private static func convertSyncEventToTrunkEvent(_ event: SyncEvent) -> TrunkEvent? {
        guard let eventType = TrunkEventType(rawValue: event.type) else {
            return nil
        }

        let payload = event.payload

        return TrunkEvent(
            type: eventType,
            timestamp: event.clientTimestamp,
            sproutId: getString(payload, "sproutId"),
            twigId: getString(payload, "twigId"),
            title: getString(payload, "title"),
            season: getString(payload, "season"),
            environment: getString(payload, "environment"),
            soilCost: getInt(payload, "soilCost"),
            leafId: getString(payload, "leafId"),
            bloomWither: getString(payload, "bloomWither"),
            bloomBudding: getString(payload, "bloomBudding"),
            bloomFlourish: getString(payload, "bloomFlourish"),
            content: getString(payload, "note") ?? getString(payload, "content"),
            prompt: getString(payload, "prompt"),
            result: getInt(payload, "result"),
            reflection: getString(payload, "reflection"),
            capacityGained: getDouble(payload, "capacityGained"),
            soilReturned: getInt(payload, "soilReturned"),
            twigLabel: getString(payload, "twigLabel"),
            name: getString(payload, "name")
        )
    }

    // MARK: - Helpers

    private static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static func isoString(_ date: Date) -> String {
        isoFormatter.string(from: date)
    }

    private static func getString(_ payload: [String: AnyCodable], _ key: String) -> String? {
        guard let codable = payload[key] else { return nil }
        return codable.value as? String
    }

    private static func getInt(_ payload: [String: AnyCodable], _ key: String) -> Int? {
        guard let codable = payload[key] else { return nil }
        if let intValue = codable.value as? Int {
            return intValue
        }
        if let doubleValue = codable.value as? Double {
            return Int(doubleValue)
        }
        return nil
    }

    private static func getDouble(_ payload: [String: AnyCodable], _ key: String) -> Double? {
        guard let codable = payload[key] else { return nil }
        if let doubleValue = codable.value as? Double {
            return doubleValue
        }
        if let intValue = codable.value as? Int {
            return Double(intValue)
        }
        return nil
    }
}
