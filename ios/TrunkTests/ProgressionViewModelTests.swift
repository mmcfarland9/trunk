//
//  ProgressionViewModelTests.swift
//  TrunkTests
//
//  Tests for ProgressionViewModel - the @Observable state manager.
//

import Testing
import Foundation
@testable import Trunk

// MARK: - Soil Operations

@Suite("ProgressionViewModel - Soil Operations")
struct SoilOperationsTests {

    @Test("spendSoil deducts from available")
    @MainActor
    func spendSoil_deductsFromAvailable() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let initial = vm.soilAvailable
        vm.spendSoil(5)

        #expect(vm.soilAvailable == initial - 5)
    }

    @Test("spendSoil works with minimum amount")
    @MainActor
    func spendSoil_minimumAmount() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let initial = vm.soilAvailable
        vm.spendSoil(1)

        #expect(vm.soilAvailable == initial - 1)
    }

    @Test("returnSoil adds to available")
    @MainActor
    func returnSoil_addsToAvailable() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        vm.spendSoil(5)
        let afterSpend = vm.soilAvailable
        vm.returnSoil(3)

        #expect(vm.soilAvailable == afterSpend + 3)
    }

    @Test("returnSoil capped at capacity")
    @MainActor
    func returnSoil_cappedAtCapacity() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        vm.returnSoil(1000)

        #expect(vm.soilAvailable <= vm.soilCapacity)
    }

    @Test("earnCapacity increases permanent capacity")
    @MainActor
    func earnCapacity_increasesPermanentCapacity() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let initial = vm.soilCapacity
        vm.earnCapacity(2.5)

        #expect(vm.soilCapacity == initial + 2.5)
    }

    @Test("earnCapacity also increases available")
    @MainActor
    func earnCapacity_alsoIncreasesAvailable() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let initialAvailable = vm.soilAvailable
        vm.earnCapacity(2.5)

        #expect(vm.soilAvailable == initialAvailable + 2.5)
    }

    @Test("earnCapacity capped at max (120)")
    @MainActor
    func earnCapacity_cappedAtMax() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        vm.earnCapacity(1000)

        #expect(vm.soilCapacity <= 120)
    }

    @Test("canAfford returns true when sufficient soil")
    @MainActor
    func canAfford_trueWhenSufficient() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        // Default capacity is 10
        #expect(vm.canAfford(cost: 5) == true)
    }

    @Test("canAfford returns false when insufficient soil")
    @MainActor
    func canAfford_falseWhenInsufficient() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        // Default capacity is 10
        #expect(vm.canAfford(cost: 15) == false)
    }

    @Test("soilCapacityInt rounds correctly")
    @MainActor
    func soilCapacityInt_rounds() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        vm.earnCapacity(0.6)

        // 10 + 0.6 = 10.6, rounds to 11
        #expect(vm.soilCapacityInt == 11)
    }

    @Test("soilAvailableInt rounds correctly")
    @MainActor
    func soilAvailableInt_rounds() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        vm.earnCapacity(0.4)

        // 10 + 0.4 = 10.4, rounds to 10
        #expect(vm.soilAvailableInt == 10)
    }
}

// MARK: - Water Operations

@Suite("ProgressionViewModel - Water Operations")
struct WaterOperationsTests {

    @Test("useWater decrements available")
    @MainActor
    func useWater_decrementsAvailable() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let initial = vm.waterAvailable
        _ = vm.useWater()

        #expect(vm.waterAvailable == initial - 1)
    }

    @Test("useWater returns true when water available")
    @MainActor
    func useWater_returnsTrueWhenAvailable() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let success = vm.useWater()

        #expect(success == true)
    }

    @Test("useWater adds soil recovery")
    @MainActor
    func useWater_addsSoilRecovery() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        vm.spendSoil(5) // Make room for recovery
        let before = vm.soilCapacity
        _ = vm.useWater()

        #expect(vm.soilCapacity > before)
    }

    @Test("useWater cannot go below zero")
    @MainActor
    func useWater_cannotGoBelowZero() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        // Exhaust water (default capacity is 3)
        _ = vm.useWater()
        _ = vm.useWater()
        _ = vm.useWater()
        _ = vm.useWater() // This should fail

        #expect(vm.waterAvailable >= 0)
    }

    @Test("useWater returns false when exhausted")
    @MainActor
    func useWater_returnsFalseWhenExhausted() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        // Exhaust water
        _ = vm.useWater()
        _ = vm.useWater()
        _ = vm.useWater()
        let result = vm.useWater()

        #expect(result == false)
    }

    @Test("waterCapacity is constant 3")
    @MainActor
    func waterCapacity_isConstant() {
        let vm = ProgressionViewModel()

        #expect(vm.waterCapacity == 3)
    }

    @Test("canWater is true when water available")
    @MainActor
    func canWater_trueWhenAvailable() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        #expect(vm.canWater == true)
    }

    @Test("canWater is false when exhausted")
    @MainActor
    func canWater_falseWhenExhausted() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        _ = vm.useWater()
        _ = vm.useWater()
        _ = vm.useWater()

        #expect(vm.canWater == false)
    }
}

// MARK: - Sun Operations

@Suite("ProgressionViewModel - Sun Operations")
struct SunOperationsTests {

    @Test("useSun decrements available")
    @MainActor
    func useSun_decrementsAvailable() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let initial = vm.sunAvailable
        _ = vm.useSun()

        #expect(vm.sunAvailable == initial - 1)
    }

    @Test("useSun returns true when sun available")
    @MainActor
    func useSun_returnsTrueWhenAvailable() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let success = vm.useSun()

        #expect(success == true)
    }

    @Test("useSun adds soil recovery")
    @MainActor
    func useSun_addsSoilRecovery() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        vm.spendSoil(5)
        let before = vm.soilCapacity
        _ = vm.useSun()

        #expect(vm.soilCapacity > before)
    }

    @Test("sun recovery is 0.35")
    @MainActor
    func sun_recoveryAmount() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let before = vm.soilCapacity
        _ = vm.useSun()
        let recovery = vm.soilCapacity - before

        #expect(abs(recovery - 0.35) < 0.01)
    }

    @Test("useSun returns false when exhausted")
    @MainActor
    func useSun_returnsFalseWhenExhausted() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        // Sun capacity is 1
        _ = vm.useSun()
        let result = vm.useSun()

        #expect(result == false)
    }

    @Test("sunCapacity is constant 1")
    @MainActor
    func sunCapacity_isConstant() {
        let vm = ProgressionViewModel()

        #expect(vm.sunCapacity == 1)
    }

    @Test("canShine is true when sun available")
    @MainActor
    func canShine_trueWhenAvailable() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        #expect(vm.canShine == true)
    }

    @Test("canShine is false when exhausted")
    @MainActor
    func canShine_falseWhenExhausted() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        _ = vm.useSun()

        #expect(vm.canShine == false)
    }
}

// MARK: - Harvest Flow

@Suite("ProgressionViewModel - Harvest")
struct HarvestTests {

    @Test("harvestSprout returns soil cost")
    @MainActor
    func harvestSprout_returnsSoilCost() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )

        vm.spendSoil(sprout.soilCost) // Simulate planting
        let afterPlant = vm.soilAvailable

        vm.harvestSprout(sprout, result: 3)

        // Soil should be returned (afterPlant + 2)
        // Plus capacity reward increases available
        #expect(vm.soilAvailable > afterPlant)
    }

    @Test("harvestSprout adds capacity reward")
    @MainActor
    func harvestSprout_addsCapacityReward() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let sprout = Sprout(
            title: "Test",
            season: .threeMonths,
            environment: .firm,
            nodeId: "branch-0-twig-0",
            soilCost: 8
        )

        let initialCapacity = vm.soilCapacity
        vm.harvestSprout(sprout, result: 4)

        #expect(vm.soilCapacity > initialCapacity)
    }

    @Test("plantSprout deducts soil cost")
    @MainActor
    func plantSprout_deductsSoilCost() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )

        let initial = vm.soilAvailable
        vm.plantSprout(sprout)

        #expect(vm.soilAvailable == initial - 2)
    }

    @Test("plantSprout uses sprout's soilCost")
    @MainActor
    func plantSprout_usesSproutCost() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        let sprout = Sprout(
            title: "Test",
            season: .oneYear,
            environment: .barren,
            nodeId: "branch-0-twig-0",
            soilCost: 24
        )

        let initial = vm.soilAvailable
        vm.plantSprout(sprout)

        #expect(vm.soilAvailable == initial - 24)
    }
}

// MARK: - Edge Cases

@Suite("ProgressionViewModel - Edge Cases")
struct EdgeCaseTests {

    @Test("cannot plant when insufficient soil")
    @MainActor
    func cannotPlant_insufficientSoil() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        vm.spendSoil(Int(vm.soilAvailable)) // Exhaust soil
        let canAfford = vm.canAfford(cost: 2) // Cheapest sprout

        #expect(canAfford == false)
    }

    @Test("capacity capped at 120")
    @MainActor
    func capacity_cappedAt120() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        for _ in 0..<100 {
            vm.earnCapacity(5)
        }

        #expect(vm.soilCapacity <= 120)
    }

    @Test("available never exceeds capacity")
    @MainActor
    func available_neverExceedsCapacity() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        vm.returnSoil(1000)

        #expect(vm.soilAvailable <= vm.soilCapacity)
    }

    @Test("refresh preserves permanent capacity")
    @MainActor
    func refresh_preservesPermanentCapacity() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        vm.earnCapacity(5)
        let beforeRefresh = vm.soilCapacity
        vm.refresh()

        #expect(vm.soilCapacity == beforeRefresh)
    }

    @Test("resetToDefaults restores starting values")
    @MainActor
    func resetToDefaults_restoresStartingValues() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        vm.spendSoil(5)
        vm.earnCapacity(10)
        vm.resetToDefaults()

        #expect(vm.soilCapacity == 10)
        #expect(vm.soilAvailable == 10)
    }

    @Test("multiple operations in sequence")
    @MainActor
    func multipleOperations_inSequence() {
        let vm = ProgressionViewModel()
        vm.resetToDefaults()

        // Simulate: plant, water, water, water, earn some capacity
        vm.spendSoil(5) // Plant something
        _ = vm.useWater()
        _ = vm.useWater()
        _ = vm.useWater()
        _ = vm.useSun()

        // Should have: 10 - 5 = 5 available
        // Plus: 3 * 0.05 (water recovery) + 0.35 (sun recovery) = 0.5 capacity earned
        // Capacity: 10 + 0.5 = 10.5
        // Available: 5 + 0.5 = 5.5

        #expect(abs(vm.soilCapacity - 10.5) < 0.01)
        #expect(abs(vm.soilAvailable - 5.5) < 0.01)
    }
}
