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

    var description: String {
        switch self {
        case .fertile: return "Easy to achieve"
        case .firm: return "Challenging stretch"
        case .barren: return "Very difficult"
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
final class Sprout {
    var id: String
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

    init(
        id: String = UUID().uuidString,
        title: String,
        season: Season,
        environment: SproutEnvironment,
        nodeId: String,
        soilCost: Int,
        bloomLow: String = "",
        bloomMid: String = "",
        bloomHigh: String = ""
    ) {
        self.id = id
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

    // Computed properties for type-safe enum access
    var season: Season {
        get { Season(rawValue: seasonRaw) ?? .oneMonth }
        set { seasonRaw = newValue.rawValue }
    }

    var environment: SproutEnvironment {
        get { SproutEnvironment(rawValue: environmentRaw) ?? .firm }
        set { environmentRaw = newValue.rawValue }
    }

    var state: SproutState {
        get { SproutState(rawValue: stateRaw) ?? .draft }
        set { stateRaw = newValue.rawValue }
    }

    var isReady: Bool {
        guard state == .active, let plantedAt = plantedAt else { return false }
        let elapsed = Date().timeIntervalSince(plantedAt) * 1000
        return Int(elapsed) >= season.durationMs
    }

    func plant() {
        state = .active
        plantedAt = Date()
    }

    func harvest(result: Int) {
        self.result = result
        self.state = .completed
        self.harvestedAt = Date()
    }

    func fail() {
        self.state = .failed
        self.harvestedAt = Date()
    }
}
