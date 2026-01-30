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
        switch self {
        case .twoWeeks: return "2 weeks"
        case .oneMonth: return "1 month"
        case .threeMonths: return "3 months"
        case .sixMonths: return "6 months"
        case .oneYear: return "1 year"
        }
    }

    var durationMs: Int {
        switch self {
        case .twoWeeks: return 1_209_600_000
        case .oneMonth: return 2_592_000_000
        case .threeMonths: return 7_776_000_000
        case .sixMonths: return 15_552_000_000
        case .oneYear: return 31_536_000_000
        }
    }
}

/// Environment difficulty for a sprout (renamed to avoid SwiftUI conflict)
enum SproutEnvironment: String, Codable, CaseIterable {
    case fertile
    case firm
    case barren

    var label: String {
        switch self {
        case .fertile: return "Fertile"
        case .firm: return "Firm"
        case .barren: return "Barren"
        }
    }

    var sproutDescription: String {
        switch self {
        case .fertile: return "Easy to achieve"
        case .firm: return "Challenging stretch"
        case .barren: return "Very difficult"
        }
    }

    /// Hint text matching web app exactly
    var formHint: String {
        switch self {
        case .fertile: return "[Comfortable terrain · no soil bonus]"
        case .firm: return "[New obstacles · +1 soil capacity]"
        case .barren: return "[Hostile conditions · +2 soil capacity]"
        }
    }
}

/// State of a sprout in its lifecycle
enum SproutState: String, Codable {
    case draft
    case active
    case completed
    case failed
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

    var bloomLow: String
    var bloomMid: String
    var bloomHigh: String

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
        bloomLow: String = "",
        bloomMid: String = "",
        bloomHigh: String = ""
    ) {
        self.sproutId = sproutId
        self.title = title
        self.seasonRaw = season.rawValue
        self.environmentRaw = environment.rawValue
        self.stateRaw = SproutState.draft.rawValue
        self.soilCost = soilCost
        self.nodeId = nodeId
        self.createdAt = Date()
        self.bloomLow = bloomLow
        self.bloomMid = bloomMid
        self.bloomHigh = bloomHigh
    }

    // Computed properties for type-safe enum access (read-only to avoid SwiftData issues)
    var season: Season {
        Season(rawValue: seasonRaw) ?? .oneMonth
    }

    var environment: SproutEnvironment {
        SproutEnvironment(rawValue: environmentRaw) ?? .firm
    }

    var state: SproutState {
        SproutState(rawValue: stateRaw) ?? .draft
    }

    var isReady: Bool {
        guard state == .active, let plantedAt = plantedAt else { return false }
        let elapsed = Date().timeIntervalSince(plantedAt) * 1000
        return Int(elapsed) >= season.durationMs
    }

    func plant() {
        stateRaw = SproutState.active.rawValue
        plantedAt = Date()
    }

    func harvest(result: Int) {
        self.result = result
        self.stateRaw = SproutState.completed.rawValue
        self.harvestedAt = Date()
    }

    func fail() {
        self.stateRaw = SproutState.failed.rawValue
        self.harvestedAt = Date()
    }
}
