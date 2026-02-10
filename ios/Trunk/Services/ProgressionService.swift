//
//  ProgressionService.swift
//  Trunk
//
//  Implements the progression system formulas for soil, water, and sun.
//

import Foundation

// MARK: - ProgressionService

struct ProgressionService {

    // MARK: - Soil Cost

    /// Calculate the soil cost to plant a sprout
    /// - Parameters:
    ///   - season: The sprout's season duration
    ///   - environment: The sprout's difficulty environment
    /// - Returns: The soil cost (integer)
    static func soilCost(season: Season, environment: SproutEnvironment) -> Int {
        guard let costs = SharedConstants.Soil.plantingCosts[season.rawValue],
              let cost = costs[environment.rawValue] else {
            return 5 // Fallback
        }
        return cost
    }

    // MARK: - Capacity Reward

    /// Calculate the capacity reward when harvesting a sprout
    /// - Parameters:
    ///   - season: The sprout's season duration
    ///   - environment: The sprout's difficulty environment
    ///   - result: The harvest result (1-5)
    ///   - currentCapacity: The user's current soil capacity
    /// - Returns: The capacity reward (Double, not rounded)
    static func capacityReward(
        season: Season,
        environment: SproutEnvironment,
        result: Int,
        currentCapacity: Double
    ) -> Double {
        let baseReward = SharedConstants.Seasons.baseRewards[season.rawValue] ?? 2.0
        let envMultiplier = SharedConstants.Soil.environmentMultipliers[environment.rawValue] ?? 1.0
        let resultMultiplier = SharedConstants.Soil.resultMultipliers[result] ?? 0.7
        let diminishingFactor = diminishingReturns(currentCapacity: currentCapacity)

        return baseReward * envMultiplier * resultMultiplier * diminishingFactor
    }

    /// Calculate the diminishing returns factor
    /// - Parameter currentCapacity: The user's current soil capacity
    /// - Returns: Diminishing factor (0.0 to 1.0)
    static func diminishingReturns(currentCapacity: Double) -> Double {
        let ratio = currentCapacity / SharedConstants.Soil.maxCapacity
        let factor = max(0, 1 - ratio)
        return pow(factor, 1.5)
    }

    // MARK: - Resource Recovery

    /// Soil capacity gained from watering a sprout
    static var waterRecovery: Double {
        SharedConstants.Soil.waterRecovery
    }

    /// Soil capacity gained from shining on a twig
    static var sunRecovery: Double {
        SharedConstants.Soil.sunRecovery
    }

    // MARK: - Sprout Timeline

    /// Calculate when a sprout will be ready for harvest
    /// - Parameters:
    ///   - plantedAt: When the sprout was planted
    ///   - season: The sprout's season duration
    /// - Returns: The harvest-ready date
    static func harvestDate(plantedAt: Date, season: Season) -> Date {
        let durationSeconds = Double(season.durationMs) / 1000.0
        return plantedAt.addingTimeInterval(durationSeconds)
    }

    /// Calculate progress percentage for an active sprout
    /// - Parameters:
    ///   - plantedAt: When the sprout was planted
    ///   - season: The sprout's season duration
    /// - Returns: Progress from 0.0 to 1.0
    static func progress(plantedAt: Date, season: Season) -> Double {
        let elapsed = Date().timeIntervalSince(plantedAt)
        let duration = Double(season.durationMs) / 1000.0
        return min(1.0, max(0.0, elapsed / duration))
    }
}
