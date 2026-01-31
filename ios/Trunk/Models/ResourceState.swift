//
//  ResourceState.swift
//  Trunk
//
//  Persisted state for soil, water, and sun resources.
//

import Foundation

struct ResourceState: Codable {
    var soilCapacity: Double
    var soilAvailable: Double
    var waterAvailable: Int
    var waterLastReset: Date
    var sunAvailable: Int
    var sunLastReset: Date

    static let defaultState = ResourceState(
        soilCapacity: TrunkConstants.Soil.startingCapacity,
        soilAvailable: TrunkConstants.Soil.startingCapacity,
        waterAvailable: TrunkConstants.Water.dailyCapacity,
        waterLastReset: Date(),
        sunAvailable: TrunkConstants.Sun.weeklyCapacity,
        sunLastReset: Date()
    )

    // MARK: - UserDefaults Persistence

    private static let storageKey = "trunk-resources-v1"

    static func load() -> ResourceState {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let state = try? JSONDecoder().decode(ResourceState.self, from: data) else {
            return .defaultState
        }
        return state
    }

    func save() {
        if let data = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(data, forKey: Self.storageKey)
        }
    }

    // MARK: - Reset Logic

    mutating func checkAndResetIfNeeded() {
        // Reset water if new day (after 6 AM)
        if ProgressionService.shouldResetWater(lastReset: waterLastReset) {
            waterAvailable = TrunkConstants.Water.dailyCapacity
            waterLastReset = Date()
        }

        // Reset sun if new week (after Monday 6 AM)
        if ProgressionService.shouldResetSun(lastReset: sunLastReset) {
            sunAvailable = TrunkConstants.Sun.weeklyCapacity
            sunLastReset = Date()
        }
    }
}
