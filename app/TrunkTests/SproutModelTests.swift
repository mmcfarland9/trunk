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
