//
//  Sprout.swift
//  Trunk
//
//  A goal being cultivated on the tree.
//

import Foundation
import SwiftData

/// Season duration for a sprout
enum Season: String, Codable, CaseIterable {
    case twoWeeks = "2w"
    case oneMonth = "1m"
    case threeMonths = "3m"
    case sixMonths = "6m"
    case oneYear = "1y"

    var label: String {
        SharedConstants.Seasons.labels[rawValue] ?? rawValue
    }

    var durationMs: Int {
        SharedConstants.Seasons.durations[rawValue] ?? 0
    }
}

/// Environment difficulty for a sprout (renamed to avoid SwiftUI conflict)
enum SproutEnvironment: String, Codable, CaseIterable {
    case fertile
    case firm
    case barren

    var label: String {
        SharedConstants.Environments.labels[rawValue] ?? rawValue.capitalized
    }

    var sproutDescription: String {
        SharedConstants.Environments.descriptions[rawValue] ?? ""
    }

    /// Hint text matching web app exactly
    var formHint: String {
        SharedConstants.Environments.formHints[rawValue] ?? ""
    }
}

/// State of a sprout in its lifecycle
enum SproutState: String, Codable {
    case active
    case completed
}

@Model
final class Sprout: Identifiable {
    var sproutId: String
    var title: String

    // Store enums as raw strings for SwiftData compatibility
    var seasonRaw: String
    var environmentRaw: String
    var stateRaw: String

    var soilCost: Int
    var result: Int?
    var nodeId: String
    var leafId: String?

    var createdAt: Date
    var plantedAt: Date?
    var harvestedAt: Date?

    var bloomWither: String
    var bloomBudding: String
    var bloomFlourish: String

    @Relationship(deleteRule: .cascade)
    var waterEntries: [WaterEntry] = []

    // Identifiable conformance
    var id: String { sproutId }

    init(
        sproutId: String = UUID().uuidString,
        title: String,
        season: Season,
        environment: SproutEnvironment,
        nodeId: String,
        soilCost: Int,
        bloomWither: String = "",
        bloomBudding: String = "",
        bloomFlourish: String = ""
    ) {
        self.sproutId = sproutId
        self.title = title
        self.seasonRaw = season.rawValue
        self.environmentRaw = environment.rawValue
        self.stateRaw = SproutState.active.rawValue
        self.soilCost = soilCost
        self.nodeId = nodeId
        self.createdAt = Date()
        self.plantedAt = Date()  // Immediately planted
        self.bloomWither = bloomWither
        self.bloomBudding = bloomBudding
        self.bloomFlourish = bloomFlourish
    }

    // Computed properties for type-safe enum access (read-only to avoid SwiftData issues)
    var season: Season {
        Season(rawValue: seasonRaw) ?? .oneMonth
    }

    var environment: SproutEnvironment {
        SproutEnvironment(rawValue: environmentRaw) ?? .firm
    }

    var state: SproutState {
        SproutState(rawValue: stateRaw) ?? .active
    }

    var isReady: Bool {
        guard state == .active, let plantedAt = plantedAt else { return false }
        let elapsed = Date().timeIntervalSince(plantedAt) * 1000
        return Int(elapsed) >= season.durationMs
    }

    func harvest(result: Int) {
        self.result = result
        self.stateRaw = SproutState.completed.rawValue
        self.harvestedAt = Date()
    }
}
