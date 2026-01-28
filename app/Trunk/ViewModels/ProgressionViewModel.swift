//
//  ProgressionViewModel.swift
//  Trunk
//
//  Observable state management for the progression system.
//

import Foundation
import SwiftData

@Observable
final class ProgressionViewModel {
    private(set) var resourceState: ResourceState

    init() {
        self.resourceState = ResourceState.load()
        self.resourceState.checkAndResetIfNeeded()
        self.resourceState.save()
    }

    // MARK: - Soil

    var soilCapacity: Double {
        resourceState.soilCapacity
    }

    var soilAvailable: Double {
        resourceState.soilAvailable
    }

    var soilCapacityInt: Int {
        Int(resourceState.soilCapacity.rounded())
    }

    var soilAvailableInt: Int {
        Int(resourceState.soilAvailable.rounded())
    }

    func canAfford(cost: Int) -> Bool {
        soilAvailable >= Double(cost)
    }

    // MARK: - Water

    var waterAvailable: Int {
        resourceState.waterAvailable
    }

    var waterCapacity: Int {
        TrunkConstants.Water.dailyCapacity
    }

    var canWater: Bool {
        waterAvailable > 0
    }

    // MARK: - Sun

    var sunAvailable: Int {
        resourceState.sunAvailable
    }

    var sunCapacity: Int {
        TrunkConstants.Sun.weeklyCapacity
    }

    var canShine: Bool {
        sunAvailable > 0
    }

    // MARK: - Actions

    /// Spend soil to plant a sprout
    func spendSoil(_ amount: Int) {
        resourceState.soilAvailable -= Double(amount)
        resourceState.save()
    }

    /// Return soil when uprooting a draft sprout
    func returnSoil(_ amount: Int) {
        resourceState.soilAvailable = min(
            resourceState.soilCapacity,
            resourceState.soilAvailable + Double(amount)
        )
        resourceState.save()
    }

    /// Use water (returns true if successful)
    @discardableResult
    func useWater() -> Bool {
        guard canWater else { return false }
        resourceState.waterAvailable -= 1
        // Watering also recovers a tiny bit of soil capacity
        earnCapacity(ProgressionService.waterRecovery)
        resourceState.save()
        return true
    }

    /// Use sun (returns true if successful)
    @discardableResult
    func useSun() -> Bool {
        guard canShine else { return false }
        resourceState.sunAvailable -= 1
        // Shining also recovers soil capacity
        earnCapacity(ProgressionService.sunRecovery)
        resourceState.save()
        return true
    }

    /// Earn permanent soil capacity (from harvesting or recovery)
    func earnCapacity(_ amount: Double) {
        resourceState.soilCapacity = min(
            TrunkConstants.Soil.maxCapacity,
            resourceState.soilCapacity + amount
        )
        // Also increase available soil by the same amount
        resourceState.soilAvailable = min(
            resourceState.soilCapacity,
            resourceState.soilAvailable + amount
        )
        resourceState.save()
    }

    /// Harvest a sprout and earn capacity reward
    func harvestSprout(_ sprout: Sprout, result: Int) {
        // Return the original soil cost
        returnSoil(sprout.soilCost)

        // Calculate and earn capacity reward
        let reward = ProgressionService.capacityReward(
            season: sprout.season,
            environment: sprout.environment,
            result: result,
            currentCapacity: soilCapacity
        )
        earnCapacity(reward)
    }

    /// Plant a sprout (deduct soil cost)
    func plantSprout(_ sprout: Sprout) {
        spendSoil(sprout.soilCost)
        sprout.plant()
    }

    /// Refresh resource state (check for resets)
    func refresh() {
        resourceState.checkAndResetIfNeeded()
        resourceState.save()
    }

    // MARK: - Debug

    func resetToDefaults() {
        resourceState = .defaultState
        resourceState.save()
    }
}
