//
//  SproutModelTests.swift
//  TrunkTests
//
//  Tests for Sprout-related enums (Season, SproutEnvironment, SproutState).
//  Note: Sprout @Model tests require full app context and are tested via UI/integration tests.
//

import Testing
import Foundation
@testable import Trunk

// MARK: - Season Enum Tests

@Suite("Season Enum")
struct SeasonEnumTests {

    @Test("Two weeks label is '2 weeks'")
    func label_twoWeeks() {
        #expect(Season.twoWeeks.label == "2 weeks")
    }

    @Test("One month label is '1 month'")
    func label_oneMonth() {
        #expect(Season.oneMonth.label == "1 month")
    }

    @Test("Three months label is '3 months'")
    func label_threeMonths() {
        #expect(Season.threeMonths.label == "3 months")
    }

    @Test("Six months label is '6 months'")
    func label_sixMonths() {
        #expect(Season.sixMonths.label == "6 months")
    }

    @Test("One year label is '1 year'")
    func label_oneYear() {
        #expect(Season.oneYear.label == "1 year")
    }

    @Test("Two weeks duration is 1,209,600,000 ms")
    func durationMs_twoWeeks() {
        // 2 weeks = 14 days * 24 hours * 60 mins * 60 secs * 1000 ms
        #expect(Season.twoWeeks.durationMs == 1_209_600_000)
    }

    @Test("One month duration is 2,592,000,000 ms")
    func durationMs_oneMonth() {
        // 30 days
        #expect(Season.oneMonth.durationMs == 2_592_000_000)
    }

    @Test("Three months duration is 7,776,000,000 ms")
    func durationMs_threeMonths() {
        // 90 days
        #expect(Season.threeMonths.durationMs == 7_776_000_000)
    }

    @Test("Six months duration is 15,552,000,000 ms")
    func durationMs_sixMonths() {
        // 180 days
        #expect(Season.sixMonths.durationMs == 15_552_000_000)
    }

    @Test("One year duration is 31,536,000,000 ms")
    func durationMs_oneYear() {
        // 365 days
        #expect(Season.oneYear.durationMs == 31_536_000_000)
    }

    @Test("Season raw values match web format")
    func rawValues_matchWebFormat() {
        #expect(Season.twoWeeks.rawValue == "2w")
        #expect(Season.oneMonth.rawValue == "1m")
        #expect(Season.threeMonths.rawValue == "3m")
        #expect(Season.sixMonths.rawValue == "6m")
        #expect(Season.oneYear.rawValue == "1y")
    }

    @Test("Season initializes from raw value")
    func initFromRawValue() {
        #expect(Season(rawValue: "2w") == .twoWeeks)
        #expect(Season(rawValue: "1m") == .oneMonth)
        #expect(Season(rawValue: "3m") == .threeMonths)
        #expect(Season(rawValue: "6m") == .sixMonths)
        #expect(Season(rawValue: "1y") == .oneYear)
        #expect(Season(rawValue: "invalid") == nil)
    }
}

// MARK: - Environment Enum Tests

@Suite("SproutEnvironment Enum")
struct EnvironmentEnumTests {

    @Test("Fertile label is 'Fertile'")
    func label_fertile() {
        #expect(SproutEnvironment.fertile.label == "Fertile")
    }

    @Test("Firm label is 'Firm'")
    func label_firm() {
        #expect(SproutEnvironment.firm.label == "Firm")
    }

    @Test("Barren label is 'Barren'")
    func label_barren() {
        #expect(SproutEnvironment.barren.label == "Barren")
    }

    @Test("Fertile description is 'Easy to achieve'")
    func description_fertile() {
        #expect(SproutEnvironment.fertile.sproutDescription == "Easy to achieve")
    }

    @Test("Firm description is 'Challenging stretch'")
    func description_firm() {
        #expect(SproutEnvironment.firm.sproutDescription == "Challenging stretch")
    }

    @Test("Barren description is 'Very difficult'")
    func description_barren() {
        #expect(SproutEnvironment.barren.sproutDescription == "Very difficult")
    }

    @Test("Fertile form hint matches web app")
    func formHint_fertile() {
        #expect(SproutEnvironment.fertile.formHint == "[Comfortable terrain · no soil bonus]")
    }

    @Test("Firm form hint matches web app")
    func formHint_firm() {
        #expect(SproutEnvironment.firm.formHint == "[New obstacles · +1 soil capacity]")
    }

    @Test("Barren form hint matches web app")
    func formHint_barren() {
        #expect(SproutEnvironment.barren.formHint == "[Hostile conditions · +2 soil capacity]")
    }

    @Test("Environment raw values match web format")
    func rawValues_matchWebFormat() {
        #expect(SproutEnvironment.fertile.rawValue == "fertile")
        #expect(SproutEnvironment.firm.rawValue == "firm")
        #expect(SproutEnvironment.barren.rawValue == "barren")
    }

    @Test("Environment initializes from raw value")
    func initFromRawValue() {
        #expect(SproutEnvironment(rawValue: "fertile") == .fertile)
        #expect(SproutEnvironment(rawValue: "firm") == .firm)
        #expect(SproutEnvironment(rawValue: "barren") == .barren)
        #expect(SproutEnvironment(rawValue: "invalid") == nil)
    }
}

// MARK: - Sprout State Enum Tests

@Suite("SproutState Enum")
struct SproutStateEnumTests {

    @Test("Active raw value is 'active'")
    func rawValue_active() {
        #expect(SproutState.active.rawValue == "active")
    }

    @Test("Completed raw value is 'completed'")
    func rawValue_completed() {
        #expect(SproutState.completed.rawValue == "completed")
    }

    @Test("State initializes from raw value")
    func initFromRawValue() {
        #expect(SproutState(rawValue: "active") == .active)
        #expect(SproutState(rawValue: "completed") == .completed)
        #expect(SproutState(rawValue: "invalid") == nil)
    }
}

// MARK: - Sprout Computed Properties Tests

@Suite("Sprout Computed Properties")
struct SproutComputedTests {

    @Test("isReady returns false before endDate")
    @MainActor
    func isReady_falseBeforeEndDate() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        // plantedAt is set to now in init, so 2 weeks haven't passed
        #expect(sprout.isReady == false)
    }

    @Test("isReady returns true after season duration")
    @MainActor
    func isReady_trueAfterDuration() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        // Set plantedAt to 15 days ago (more than 2 weeks)
        sprout.plantedAt = Date().addingTimeInterval(-86400 * 15)
        #expect(sprout.isReady == true)
    }

    @Test("isReady returns false when no plantedAt")
    @MainActor
    func isReady_falseWhenNoPlantedAt() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        sprout.plantedAt = nil
        #expect(sprout.isReady == false)
    }

    @Test("isReady returns false when completed")
    @MainActor
    func isReady_falseWhenCompleted() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        sprout.plantedAt = Date().addingTimeInterval(-86400 * 15) // Past due
        sprout.stateRaw = SproutState.completed.rawValue
        #expect(sprout.isReady == false)
    }

    @Test("season computed property returns correct enum")
    @MainActor
    func season_returnsCorrectEnum() {
        let sprout = Sprout(
            title: "Test",
            season: .threeMonths,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 5
        )
        #expect(sprout.season == .threeMonths)
    }

    @Test("environment computed property returns correct enum")
    @MainActor
    func environment_returnsCorrectEnum() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .barren,
            nodeId: "branch-0-twig-0",
            soilCost: 4
        )
        #expect(sprout.environment == .barren)
    }

    @Test("state computed property returns correct enum")
    @MainActor
    func state_returnsCorrectEnum() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        #expect(sprout.state == .active)
    }

    @Test("state defaults to active")
    @MainActor
    func state_defaultsToActive() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        #expect(sprout.stateRaw == "active")
    }

    @Test("plantedAt is set on init")
    @MainActor
    func plantedAt_setOnInit() {
        let before = Date()
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        let after = Date()

        #expect(sprout.plantedAt != nil)
        #expect(sprout.plantedAt! >= before)
        #expect(sprout.plantedAt! <= after)
    }
}

// MARK: - Sprout Harvest Tests

@Suite("Sprout Harvest")
struct SproutHarvestTests {

    @Test("harvest sets result")
    @MainActor
    func harvest_setsResult() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        sprout.harvest(result: 4)
        #expect(sprout.result == 4)
    }

    @Test("harvest sets state to completed")
    @MainActor
    func harvest_setsStateToCompleted() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        sprout.harvest(result: 3)
        #expect(sprout.state == .completed)
    }

    @Test("harvest sets harvestedAt")
    @MainActor
    func harvest_setsHarvestedAt() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        #expect(sprout.harvestedAt == nil)
        sprout.harvest(result: 5)
        #expect(sprout.harvestedAt != nil)
    }

    @Test("harvest with result 1")
    @MainActor
    func harvest_withResult1() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        sprout.harvest(result: 1)
        #expect(sprout.result == 1)
        #expect(sprout.state == .completed)
    }

    @Test("harvest with result 5")
    @MainActor
    func harvest_withResult5() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        sprout.harvest(result: 5)
        #expect(sprout.result == 5)
        #expect(sprout.state == .completed)
    }

    @Test("harvestedAt timestamp is recent")
    @MainActor
    func harvestedAt_timestampIsRecent() {
        let before = Date()
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        sprout.harvest(result: 3)
        let after = Date()

        #expect(sprout.harvestedAt! >= before)
        #expect(sprout.harvestedAt! <= after)
    }
}

// MARK: - Sprout Initialization Tests

@Suite("Sprout Initialization")
struct SproutInitTests {

    @Test("sprout generates unique id")
    @MainActor
    func init_generatesUniqueId() {
        let sprout1 = Sprout(
            title: "Test 1",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        let sprout2 = Sprout(
            title: "Test 2",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        #expect(sprout1.sproutId != sprout2.sproutId)
    }

    @Test("sprout stores title")
    @MainActor
    func init_storesTitle() {
        let sprout = Sprout(
            title: "My Goal",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        #expect(sprout.title == "My Goal")
    }

    @Test("sprout stores nodeId")
    @MainActor
    func init_storesNodeId() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-2-twig-5",
            soilCost: 2
        )
        #expect(sprout.nodeId == "branch-2-twig-5")
    }

    @Test("sprout stores soilCost")
    @MainActor
    func init_storesSoilCost() {
        let sprout = Sprout(
            title: "Test",
            season: .oneYear,
            environment: .barren,
            nodeId: "branch-0-twig-0",
            soilCost: 24
        )
        #expect(sprout.soilCost == 24)
    }

    @Test("sprout stores bloom descriptions")
    @MainActor
    func init_storesBloomDescriptions() {
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2,
            bloomWither: "Failed",
            bloomBudding: "Partially done",
            bloomFlourish: "Fully achieved"
        )
        #expect(sprout.bloomWither == "Failed")
        #expect(sprout.bloomBudding == "Partially done")
        #expect(sprout.bloomFlourish == "Fully achieved")
    }

    @Test("id property returns sproutId")
    @MainActor
    func id_returnsSproutId() {
        let sprout = Sprout(
            sproutId: "custom-id-123",
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        #expect(sprout.id == "custom-id-123")
    }

    @Test("createdAt is set on init")
    @MainActor
    func createdAt_setOnInit() {
        let before = Date()
        let sprout = Sprout(
            title: "Test",
            season: .twoWeeks,
            environment: .fertile,
            nodeId: "branch-0-twig-0",
            soilCost: 2
        )
        let after = Date()

        #expect(sprout.createdAt >= before)
        #expect(sprout.createdAt <= after)
    }
}
