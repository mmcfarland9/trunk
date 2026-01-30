//
//  DataExportService.swift
//  Trunk
//
//  Export and import data in v4 event-sourced format.
//  Compatible with web app's export format.
//

import Foundation
import SwiftData

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

    /// Generate v4 export payload from SwiftData models
    static func generateExport(
        sprouts: [Sprout],
        leaves: [Leaf],
        sunEntries: [SunEntry],
        nodeData: [NodeData],
        soilCapacity: Double
    ) -> ExportPayload {
        var events: [TrunkEvent] = []

        // Collect all events from models

        // Leaf creation events
        for leaf in leaves {
            events.append(.leafCreated(
                timestamp: isoString(leaf.createdAt),
                leafId: leaf.id,
                twigId: leaf.nodeId,
                name: leaf.name
            ))
        }

        // Sprout events
        for sprout in sprouts {
            // Only include active/completed sprouts
            guard sprout.state == .active || sprout.state == .completed else { continue }

            // Planted event
            let plantedTimestamp = sprout.plantedAt ?? sprout.createdAt
            events.append(.sproutPlanted(
                timestamp: isoString(plantedTimestamp),
                sproutId: sprout.sproutId,
                twigId: sprout.nodeId,
                title: sprout.title,
                season: sprout.seasonRaw,
                environment: sprout.environmentRaw,
                soilCost: sprout.soilCost,
                leafId: sprout.leafId,
                bloomWither: sprout.bloomWither.isEmpty ? nil : sprout.bloomWither,
                bloomBudding: sprout.bloomBudding.isEmpty ? nil : sprout.bloomBudding,
                bloomFlourish: sprout.bloomFlourish.isEmpty ? nil : sprout.bloomFlourish
            ))

            // Water events
            for entry in sprout.waterEntries {
                events.append(.sproutWatered(
                    timestamp: isoString(entry.timestamp),
                    sproutId: sprout.sproutId,
                    content: entry.content,
                    prompt: entry.prompt
                ))
            }

            // Harvest event (if completed)
            if sprout.state == .completed, let result = sprout.result {
                let harvestTimestamp = sprout.harvestedAt ?? Date()
                let capacityGained = ProgressionService.capacityReward(
                    season: sprout.season,
                    environment: sprout.environment,
                    result: result,
                    currentCapacity: soilCapacity
                )

                events.append(.sproutHarvested(
                    timestamp: isoString(harvestTimestamp),
                    sproutId: sprout.sproutId,
                    result: result,
                    reflection: nil,
                    capacityGained: capacityGained
                ))
            }
        }

        // Sun events
        for entry in sunEntries {
            events.append(.sunShone(
                timestamp: isoString(entry.timestamp),
                twigId: entry.twigId,
                twigLabel: entry.twigLabel,
                content: entry.content,
                prompt: entry.prompt
            ))
        }

        // Sort events chronologically
        events.sort { $0.timestamp < $1.timestamp }

        // Build circles (node labels/notes)
        var circles: [String: CircleData] = [:]
        for node in nodeData {
            circles[node.nodeId] = CircleData(
                label: node.label.isEmpty ? nil : node.label,
                note: node.note.isEmpty ? nil : node.note
            )
        }

        return ExportPayload(
            version: 4,
            exportedAt: isoString(Date()),
            events: events,
            circles: circles,
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

    /// Rebuild SwiftData models from imported events
    /// Returns (sprouts, leaves, sunEntries)
    static func rebuildFromEvents(
        _ events: [TrunkEvent],
        circles: [String: CircleData],
        context: ModelContext
    ) -> (sprouts: [Sprout], leaves: [Leaf], sunEntries: [SunEntry], nodeData: [NodeData]) {
        var sprouts: [Sprout] = []
        var leaves: [Leaf] = []
        var sunEntries: [SunEntry] = []
        var nodeData: [NodeData] = []

        // Track sprouts by ID for water/harvest events
        var sproutMap: [String: Sprout] = [:]

        for event in events {
            switch event.type {
            case .leafCreated:
                guard let leafId = event.leafId ?? event.sproutId, // leafId might be in sproutId field
                      let twigId = event.twigId,
                      let name = event.name else { continue }

                let leaf = Leaf(id: leafId, name: name, nodeId: twigId)
                leaf.createdAt = parseISODate(event.timestamp)
                leaves.append(leaf)

            case .sproutPlanted:
                guard let sproutId = event.sproutId,
                      let twigId = event.twigId,
                      let title = event.title,
                      let seasonRaw = event.season,
                      let environmentRaw = event.environment,
                      let soilCost = event.soilCost else { continue }

                let season = Season(rawValue: seasonRaw) ?? .oneMonth
                let environment = SproutEnvironment(rawValue: environmentRaw) ?? .firm

                let sprout = Sprout(
                    sproutId: sproutId,
                    title: title,
                    season: season,
                    environment: environment,
                    nodeId: twigId,
                    soilCost: soilCost,
                    bloomWither: event.bloomWither ?? "",
                    bloomBudding: event.bloomBudding ?? "",
                    bloomFlourish: event.bloomFlourish ?? ""
                )
                sprout.leafId = event.leafId
                sprout.plantedAt = parseISODate(event.timestamp)
                sprout.createdAt = parseISODate(event.timestamp)

                sprouts.append(sprout)
                sproutMap[sproutId] = sprout

            case .sproutWatered:
                guard let sproutId = event.sproutId,
                      let content = event.content,
                      let sprout = sproutMap[sproutId] else { continue }

                let entry = WaterEntry(content: content, prompt: event.prompt)
                entry.timestamp = parseISODate(event.timestamp)
                entry.sprout = sprout
                sprout.waterEntries.append(entry)

            case .sproutHarvested:
                guard let sproutId = event.sproutId,
                      let result = event.result,
                      let sprout = sproutMap[sproutId] else { continue }

                sprout.harvest(result: result)
                sprout.harvestedAt = parseISODate(event.timestamp)

            case .sproutUprooted:
                // Uprooted sprouts are removed from the map (not exported)
                if let sproutId = event.sproutId {
                    if let index = sprouts.firstIndex(where: { $0.sproutId == sproutId }) {
                        sprouts.remove(at: index)
                    }
                    sproutMap.removeValue(forKey: sproutId)
                }

            case .sunShone:
                guard let twigId = event.twigId,
                      let content = event.content else { continue }

                let entry = SunEntry(
                    content: content,
                    prompt: event.prompt,
                    twigId: twigId,
                    twigLabel: event.twigLabel ?? ""
                )
                entry.timestamp = parseISODate(event.timestamp)
                sunEntries.append(entry)
            }
        }

        // Build node data from circles
        for (nodeId, circle) in circles {
            let node = NodeData(
                nodeId: nodeId,
                label: circle.label ?? "",
                note: circle.note ?? ""
            )
            nodeData.append(node)
        }

        return (sprouts, leaves, sunEntries, nodeData)
    }

    // MARK: - Helpers

    private static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let isoFormatterNoFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private static func isoString(_ date: Date) -> String {
        isoFormatter.string(from: date)
    }

    private static func parseISODate(_ string: String) -> Date {
        isoFormatter.date(from: string) ??
        isoFormatterNoFraction.date(from: string) ??
        Date()
    }
}

