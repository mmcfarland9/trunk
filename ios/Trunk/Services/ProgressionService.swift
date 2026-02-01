//
//  ProgressionService.swift
//  Trunk
//
//  Implements the progression system formulas for soil, water, and sun.
//

import Foundation

// MARK: - Constants
// Now uses SharedConstants (auto-generated from shared/constants.json)
// Legacy alias for backward compatibility
typealias TrunkConstants = SharedConstants

// MARK: - ProgressionService

struct ProgressionService {

    // MARK: - Soil Cost

    /// Calculate the soil cost to plant a sprout
    /// - Parameters:
    ///   - season: The sprout's season duration
    ///   - environment: The sprout's difficulty environment
    /// - Returns: The soil cost (integer)
    static func soilCost(season: Season, environment: SproutEnvironment) -> Int {
        guard let costs = TrunkConstants.Soil.plantingCosts[season.rawValue],
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
        let envMultiplier = TrunkConstants.Soil.environmentMultipliers[environment.rawValue] ?? 1.0
        let resultMultiplier = TrunkConstants.Soil.resultMultipliers[result] ?? 0.7
        let diminishingFactor = diminishingReturns(currentCapacity: currentCapacity)

        return baseReward * envMultiplier * resultMultiplier * diminishingFactor
    }

    /// Calculate the diminishing returns factor
    /// - Parameter currentCapacity: The user's current soil capacity
    /// - Returns: Diminishing factor (0.0 to 1.0)
    static func diminishingReturns(currentCapacity: Double) -> Double {
        let ratio = currentCapacity / TrunkConstants.Soil.maxCapacity
        let factor = max(0, 1 - ratio)
        return pow(factor, 1.5)
    }

    // MARK: - Resource Recovery

    /// Soil capacity gained from watering a sprout
    static var waterRecovery: Double {
        TrunkConstants.Soil.waterRecovery
    }

    /// Soil capacity gained from shining on a twig
    static var sunRecovery: Double {
        TrunkConstants.Soil.sunRecovery
    }

    // MARK: - Reset Time Calculations

    /// Check if water should be reset (daily at 6 AM)
    /// - Parameter lastReset: The last reset timestamp
    /// - Returns: True if water should be reset
    static func shouldResetWater(lastReset: Date) -> Bool {
        let calendar = Calendar.current
        let now = Date()

        // Get the most recent 6 AM
        var components = calendar.dateComponents([.year, .month, .day], from: now)
        components.hour = TrunkConstants.Water.resetHour
        components.minute = 0
        components.second = 0

        guard let todayReset = calendar.date(from: components) else { return false }

        // If it's before 6 AM today, use yesterday's 6 AM
        let effectiveReset = now < todayReset
            ? calendar.date(byAdding: .day, value: -1, to: todayReset)!
            : todayReset

        return lastReset < effectiveReset
    }

    /// Check if sun should be reset (weekly on Monday at 6 AM)
    /// - Parameter lastReset: The last reset timestamp
    /// - Returns: True if sun should be reset
    static func shouldResetSun(lastReset: Date) -> Bool {
        let calendar = Calendar.current
        let now = Date()

        // Get the ISO week number for both dates
        let lastWeek = calendar.component(.weekOfYear, from: lastReset)
        let lastYear = calendar.component(.yearForWeekOfYear, from: lastReset)
        let thisWeek = calendar.component(.weekOfYear, from: now)
        let thisYear = calendar.component(.yearForWeekOfYear, from: now)

        // Different week = reset
        if thisYear > lastYear || thisWeek > lastWeek {
            // Also check if we've passed 6 AM on Monday
            let weekday = calendar.component(.weekday, from: now)
            let hour = calendar.component(.hour, from: now)

            // Sunday=1, Monday=2 in Calendar
            if weekday > 2 || (weekday == 2 && hour >= TrunkConstants.Sun.resetHour) {
                return true
            }
        }

        return false
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
