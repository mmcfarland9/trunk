//
//  ProgressionServiceTests.swift
//  TrunkTests
//
//  Tests for ProgressionService calculations - the core game mechanics.
//

import Testing
import Foundation
@testable import Trunk

// MARK: - Soil Cost Tests

@Suite("Soil Cost Calculations")
struct SoilCostTests {

    // MARK: - Two Weeks Season

    @Test("2w/fertile costs 2 soil")
    func soilCost_twoWeeks_fertile() {
        #expect(ProgressionService.soilCost(season: .twoWeeks, environment: .fertile) == 2)
    }

    @Test("2w/firm costs 3 soil")
    func soilCost_twoWeeks_firm() {
        #expect(ProgressionService.soilCost(season: .twoWeeks, environment: .firm) == 3)
    }

    @Test("2w/barren costs 4 soil")
    func soilCost_twoWeeks_barren() {
        #expect(ProgressionService.soilCost(season: .twoWeeks, environment: .barren) == 4)
    }

    // MARK: - One Month Season

    @Test("1m/fertile costs 3 soil")
    func soilCost_oneMonth_fertile() {
        #expect(ProgressionService.soilCost(season: .oneMonth, environment: .fertile) == 3)
    }

    @Test("1m/firm costs 5 soil")
    func soilCost_oneMonth_firm() {
        #expect(ProgressionService.soilCost(season: .oneMonth, environment: .firm) == 5)
    }

    @Test("1m/barren costs 6 soil")
    func soilCost_oneMonth_barren() {
        #expect(ProgressionService.soilCost(season: .oneMonth, environment: .barren) == 6)
    }

    // MARK: - Three Months Season

    @Test("3m/fertile costs 5 soil")
    func soilCost_threeMonths_fertile() {
        #expect(ProgressionService.soilCost(season: .threeMonths, environment: .fertile) == 5)
    }

    @Test("3m/firm costs 8 soil")
    func soilCost_threeMonths_firm() {
        #expect(ProgressionService.soilCost(season: .threeMonths, environment: .firm) == 8)
    }

    @Test("3m/barren costs 10 soil")
    func soilCost_threeMonths_barren() {
        #expect(ProgressionService.soilCost(season: .threeMonths, environment: .barren) == 10)
    }

    // MARK: - Six Months Season

    @Test("6m/fertile costs 8 soil")
    func soilCost_sixMonths_fertile() {
        #expect(ProgressionService.soilCost(season: .sixMonths, environment: .fertile) == 8)
    }

    @Test("6m/firm costs 12 soil")
    func soilCost_sixMonths_firm() {
        #expect(ProgressionService.soilCost(season: .sixMonths, environment: .firm) == 12)
    }

    @Test("6m/barren costs 16 soil")
    func soilCost_sixMonths_barren() {
        #expect(ProgressionService.soilCost(season: .sixMonths, environment: .barren) == 16)
    }

    // MARK: - One Year Season

    @Test("1y/fertile costs 12 soil")
    func soilCost_oneYear_fertile() {
        #expect(ProgressionService.soilCost(season: .oneYear, environment: .fertile) == 12)
    }

    @Test("1y/firm costs 18 soil")
    func soilCost_oneYear_firm() {
        #expect(ProgressionService.soilCost(season: .oneYear, environment: .firm) == 18)
    }

    @Test("1y/barren costs 24 soil")
    func soilCost_oneYear_barren() {
        #expect(ProgressionService.soilCost(season: .oneYear, environment: .barren) == 24)
    }
}

// MARK: - Capacity Reward Tests

@Suite("Capacity Reward Calculations")
struct CapacityRewardTests {

    // MARK: - Base Rewards
    // Base rewards from shared/constants.json: 2w=0.26, 1m=0.56, 3m=1.95, 6m=4.16, 1y=8.84

    @Test("Base reward for 2w season is 0.26")
    func capacityReward_baseReward_twoWeeks() {
        // At capacity 0, diminishing factor is 1.0
        // fertile multiplier is 1.1, result 5 multiplier is 1.0
        // So: 0.26 * 1.1 * 1.0 * 1.0 = 0.286
        let reward = ProgressionService.capacityReward(
            season: .twoWeeks,
            environment: .fertile,
            result: 5,
            currentCapacity: 0
        )
        #expect(abs(reward - 0.286) < 0.01)
    }

    @Test("Base reward for 1y season is 8.84")
    func capacityReward_baseReward_oneYear() {
        // At capacity 0: 8.84 * 1.1 * 1.0 * 1.0 = 9.724
        let reward = ProgressionService.capacityReward(
            season: .oneYear,
            environment: .fertile,
            result: 5,
            currentCapacity: 0
        )
        #expect(abs(reward - 9.724) < 0.01)
    }

    // MARK: - Environment Multipliers

    @Test("Fertile environment applies 1.1x multiplier")
    func capacityReward_fertileMultiplier() {
        let reward = ProgressionService.capacityReward(
            season: .twoWeeks,
            environment: .fertile,
            result: 5,
            currentCapacity: 0
        )
        // 0.26 base * 1.1 env * 1.0 result * 1.0 diminishing = 0.286
        #expect(abs(reward - 0.286) < 0.01)
    }

    @Test("Firm environment applies 1.75x multiplier")
    func capacityReward_firmMultiplier() {
        let reward = ProgressionService.capacityReward(
            season: .twoWeeks,
            environment: .firm,
            result: 5,
            currentCapacity: 0
        )
        // 0.26 base * 1.75 env * 1.0 result * 1.0 diminishing = 0.455
        #expect(abs(reward - 0.455) < 0.01)
    }

    @Test("Barren environment applies 2.4x multiplier")
    func capacityReward_barrenMultiplier() {
        let reward = ProgressionService.capacityReward(
            season: .twoWeeks,
            environment: .barren,
            result: 5,
            currentCapacity: 0
        )
        // 0.26 base * 2.4 env * 1.0 result * 1.0 diminishing = 0.624
        #expect(abs(reward - 0.624) < 0.01)
    }

    // MARK: - Result Multipliers

    @Test("Result 1 applies 0.4x multiplier")
    func capacityReward_result1Multiplier() {
        let reward = ProgressionService.capacityReward(
            season: .twoWeeks,
            environment: .fertile,
            result: 1,
            currentCapacity: 0
        )
        // 0.26 base * 1.1 env * 0.4 result * 1.0 diminishing = 0.1144
        #expect(abs(reward - 0.1144) < 0.01)
    }

    @Test("Result 3 applies 0.7x multiplier")
    func capacityReward_result3Multiplier() {
        let reward = ProgressionService.capacityReward(
            season: .twoWeeks,
            environment: .fertile,
            result: 3,
            currentCapacity: 0
        )
        // 0.26 base * 1.1 env * 0.7 result * 1.0 diminishing = 0.2002
        #expect(abs(reward - 0.2002) < 0.01)
    }

    @Test("Result 5 applies 1.0x multiplier")
    func capacityReward_result5Multiplier() {
        let reward = ProgressionService.capacityReward(
            season: .twoWeeks,
            environment: .fertile,
            result: 5,
            currentCapacity: 0
        )
        // 0.26 base * 1.1 env * 1.0 result * 1.0 diminishing = 0.286
        #expect(abs(reward - 0.286) < 0.01)
    }

    // MARK: - Diminishing Returns

    @Test("Diminishing returns at capacity 0 is 1.0")
    func diminishingReturns_atZero() {
        let factor = ProgressionService.diminishingReturns(currentCapacity: 0)
        #expect(abs(factor - 1.0) < 0.001)
    }

    @Test("Diminishing returns at capacity 50 is approximately 0.445")
    func diminishingReturns_atFifty() {
        let factor = ProgressionService.diminishingReturns(currentCapacity: 50)
        // pow(1 - 50/120, 1.5) = pow(0.583, 1.5) ≈ 0.445
        #expect(abs(factor - 0.445) < 0.01)
    }

    @Test("Diminishing returns at capacity 99 is approximately 0.073")
    func diminishingReturns_atNinetyNine() {
        let factor = ProgressionService.diminishingReturns(currentCapacity: 99)
        // pow(1 - 99/120, 1.5) = pow(0.175, 1.5) ≈ 0.073
        #expect(abs(factor - 0.073) < 0.01)
    }

    @Test("Full formula: 1y/barren/result5/cap0 = 21.216")
    func capacityReward_fullFormula() {
        let reward = ProgressionService.capacityReward(
            season: .oneYear,
            environment: .barren,
            result: 5,
            currentCapacity: 0
        )
        // 8.84 base * 2.4 env * 1.0 result * 1.0 diminishing = 21.216
        #expect(abs(reward - 21.216) < 0.1)
    }
}

// MARK: - Reset Logic Tests

@Suite("Reset Logic")
struct ResetLogicTests {

    @Test("Water should reset after 6 AM on new day")
    func shouldResetWater_afterSixAM() {
        // Create a date from yesterday at 5 AM
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day], from: Date())
        components.day! -= 1
        components.hour = 5
        components.minute = 0
        components.second = 0
        let lastReset = calendar.date(from: components)!

        #expect(ProgressionService.shouldResetWater(lastReset: lastReset) == true)
    }

    @Test("Water should not reset before 6 AM same effective day")
    func shouldResetWater_sameDay() {
        // This test depends on current time, so we'll test the logic differently
        // If last reset was within the current day's reset period, should not reset
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day], from: Date())
        components.hour = 6
        components.minute = 0
        components.second = 0
        let todayReset = calendar.date(from: components)!

        // If we're after 6 AM today, a reset at 7 AM today should not trigger reset
        if Date() > todayReset {
            let recentReset = todayReset.addingTimeInterval(3600) // 7 AM
            #expect(ProgressionService.shouldResetWater(lastReset: recentReset) == false)
        }
    }

    @Test("Sun should reset on new week after 6 AM Monday")
    func shouldResetSun_newWeekAfterSixAM() {
        // Create a date from last week
        let calendar = Calendar.current
        let lastWeek = calendar.date(byAdding: .weekOfYear, value: -1, to: Date())!

        // This should trigger a reset (assuming we're past Monday 6 AM)
        let weekday = calendar.component(.weekday, from: Date())
        let hour = calendar.component(.hour, from: Date())

        if weekday > 2 || (weekday == 2 && hour >= 6) {
            #expect(ProgressionService.shouldResetSun(lastReset: lastWeek) == true)
        }
    }

    @Test("Sun should not reset within same week")
    func shouldResetSun_sameWeek() {
        // Create a date from 1 hour ago (same week)
        let recentReset = Date().addingTimeInterval(-3600)

        #expect(ProgressionService.shouldResetSun(lastReset: recentReset) == false)
    }

    @Test("Harvest date adds season duration to planted date")
    func harvestDate_addsDuration() {
        let planted = Date()
        let harvestDate = ProgressionService.harvestDate(plantedAt: planted, season: .twoWeeks)

        // 2 weeks = 1,209,600,000 ms = 1,209,600 seconds
        let expectedInterval: TimeInterval = 1_209_600
        let actualInterval = harvestDate.timeIntervalSince(planted)

        #expect(abs(actualInterval - expectedInterval) < 1.0)
    }

    @Test("Progress at midway point is 0.5")
    func progress_midway() {
        // Create a date 1 week ago for a 2-week season
        let oneWeekAgo = Date().addingTimeInterval(-604_800)
        let progress = ProgressionService.progress(plantedAt: oneWeekAgo, season: .twoWeeks)

        #expect(abs(progress - 0.5) < 0.1)
    }
}

// MARK: - Recovery Rates

@Suite("Recovery Rates")
struct RecoveryRateTests {

    @Test("Water recovery rate is 0.05")
    func waterRecoveryRate() {
        #expect(abs(ProgressionService.waterRecovery - 0.05) < 0.001)
    }

    @Test("Sun recovery rate is 0.35")
    func sunRecoveryRate() {
        #expect(abs(ProgressionService.sunRecovery - 0.35) < 0.001)
    }
}
