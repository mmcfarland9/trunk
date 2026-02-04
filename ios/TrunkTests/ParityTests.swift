//
//  ParityTests.swift
//  TrunkTests
//
//  Cross-platform parity tests.
//  These tests load fixtures from shared/test-fixtures/ and verify
//  that iOS derivation produces identical results to expected values.
//  Web should have matching tests that verify the same expectations.
//

import Testing
import Foundation
@testable import Trunk

// MARK: - Parity Fixture

struct ParityFixture: Decodable {
    let _testDate: String
    let events: [ParityEvent]
    let expectedState: ExpectedState

    struct ExpectedState: Decodable {
        let soilCapacity: Double
        let soilAvailable: Double
        let sproutCount: Int
        let activeSproutCount: Int
        let completedSproutCount: Int
        let leafCount: Int
        let sunEntryCount: Int
        let waterAvailable: WaterAvailable
        let sunAvailable: SunAvailable
        let sproutDetails: [String: SproutDetail]
        let sproutsForTwig: [String: Int]
        let leavesForTwig: [String: Int]
    }

    struct WaterAvailable: Decodable {
        let value: Int
    }

    struct SunAvailable: Decodable {
        let value: Int
    }

    struct SproutDetail: Decodable {
        let state: String
        let waterEntryCount: Int
        let result: Int?
        let reflection: String?
    }
}

struct ParityEvent: Decodable {
    let type: String
    let timestamp: String
    let sproutId: String?
    let twigId: String?
    let leafId: String?
    let title: String?
    let season: String?
    let environment: String?
    let soilCost: Int?
    let content: String?
    let prompt: String?
    let result: Int?
    let capacityGained: Double?
    let reflection: String?
    let name: String?
    let twigLabel: String?
    let bloomWither: String?
    let bloomBudding: String?
    let bloomFlourish: String?
}

// MARK: - Week Boundary Fixture

struct WeekBoundaryFixture: Decodable {
    let scenarios: [SunScenario]
    let waterBoundaryTests: [WaterScenario]

    struct SunScenario: Decodable {
        let name: String
        let testTime: String
        let events: [ParityEvent]
        let expected: SunExpected
    }

    struct SunExpected: Decodable {
        let sunAvailable: Int
    }

    struct WaterScenario: Decodable {
        let name: String
        let testTime: String
        let events: [ParityEvent]
        let expected: WaterExpected
    }

    struct WaterExpected: Decodable {
        let waterAvailable: Int
    }
}

// MARK: - Test Helpers

func loadParityFixture() -> ParityFixture? {
    guard let url = Bundle(for: TrunkTestHelper.self).url(forResource: "derivation-parity", withExtension: "json") else {
        // Try loading from shared directory for tests
        let path = URL(fileURLWithPath: #file)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("shared/test-fixtures/derivation-parity.json")
        guard let data = try? Data(contentsOf: path) else { return nil }
        return try? JSONDecoder().decode(ParityFixture.self, from: data)
    }
    guard let data = try? Data(contentsOf: url) else { return nil }
    return try? JSONDecoder().decode(ParityFixture.self, from: data)
}

func loadWeekBoundaryFixture() -> WeekBoundaryFixture? {
    let path = URL(fileURLWithPath: #file)
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .appendingPathComponent("shared/test-fixtures/week-boundary.json")
    guard let data = try? Data(contentsOf: path) else { return nil }
    return try? JSONDecoder().decode(WeekBoundaryFixture.self, from: data)
}

func convertToSyncEvents(_ events: [ParityEvent]) -> [SyncEvent] {
    events.map { event in
        var payload: [String: AnyCodable] = [:]

        if let v = event.sproutId { payload["sproutId"] = AnyCodable(v) }
        if let v = event.twigId { payload["twigId"] = AnyCodable(v) }
        if let v = event.leafId { payload["leafId"] = AnyCodable(v) }
        if let v = event.title { payload["title"] = AnyCodable(v) }
        if let v = event.season { payload["season"] = AnyCodable(v) }
        if let v = event.environment { payload["environment"] = AnyCodable(v) }
        if let v = event.soilCost { payload["soilCost"] = AnyCodable(v) }
        if let v = event.content { payload["note"] = AnyCodable(v) }
        if let v = event.prompt { payload["prompt"] = AnyCodable(v) }
        if let v = event.result { payload["result"] = AnyCodable(v) }
        if let v = event.capacityGained { payload["capacityGained"] = AnyCodable(v) }
        if let v = event.reflection { payload["reflection"] = AnyCodable(v) }
        if let v = event.name { payload["name"] = AnyCodable(v) }
        if let v = event.twigLabel { payload["twigLabel"] = AnyCodable(v) }
        if let v = event.bloomWither { payload["bloomWither"] = AnyCodable(v) }
        if let v = event.bloomBudding { payload["bloomBudding"] = AnyCodable(v) }
        if let v = event.bloomFlourish { payload["bloomFlourish"] = AnyCodable(v) }

        return SyncEvent(
            id: UUID(),
            userId: UUID(),
            type: event.type,
            payload: payload,
            clientId: "test",
            clientTimestamp: event.timestamp,
            createdAt: event.timestamp
        )
    }
}

// Helper class for bundle lookup
class TrunkTestHelper {}

// MARK: - Derivation Parity Tests

@Suite("Cross-Platform Parity Tests")
struct DerivationParityTests {

    @Test("derives correct soil capacity")
    func soilCapacity() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let state = deriveState(from: events)

        #expect(abs(state.soilCapacity - fixture.expectedState.soilCapacity) < 0.01)
    }

    @Test("derives correct soil available")
    func soilAvailable() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let state = deriveState(from: events)

        #expect(abs(state.soilAvailable - fixture.expectedState.soilAvailable) < 0.01)
    }

    @Test("derives correct sprout count")
    func sproutCount() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let state = deriveState(from: events)

        #expect(state.sprouts.count == fixture.expectedState.sproutCount)
    }

    @Test("derives correct active sprout count")
    func activeSproutCount() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let state = deriveState(from: events)
        let active = getActiveSprouts(from: state)

        #expect(active.count == fixture.expectedState.activeSproutCount)
    }

    @Test("derives correct completed sprout count")
    func completedSproutCount() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let state = deriveState(from: events)
        let completed = getCompletedSprouts(from: state)

        #expect(completed.count == fixture.expectedState.completedSproutCount)
    }

    @Test("derives correct leaf count")
    func leafCount() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let state = deriveState(from: events)

        #expect(state.leaves.count == fixture.expectedState.leafCount)
    }

    @Test("derives correct sun entry count")
    func sunEntryCount() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let state = deriveState(from: events)

        #expect(state.sunEntries.count == fixture.expectedState.sunEntryCount)
    }

    @Test("derives correct water available")
    func waterAvailable() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let testDate = ISO8601DateFormatter().date(from: fixture._testDate)!
        let available = deriveWaterAvailable(from: events, now: testDate)

        #expect(available == fixture.expectedState.waterAvailable.value)
    }

    @Test("derives correct sun available")
    func sunAvailable() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let testDate = ISO8601DateFormatter().date(from: fixture._testDate)!
        let available = deriveSunAvailable(from: events, now: testDate)

        #expect(available == fixture.expectedState.sunAvailable.value)
    }

    @Test("derives correct sprout states")
    func sproutStates() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let state = deriveState(from: events)

        for (id, expectedDetail) in fixture.expectedState.sproutDetails {
            guard let sprout = state.sprouts[id] else {
                Issue.record("Sprout \(id) should exist")
                continue
            }
            #expect(sprout.state.rawValue == expectedDetail.state)
            #expect(sprout.waterEntries.count == expectedDetail.waterEntryCount)
            if let expectedResult = expectedDetail.result {
                #expect(sprout.result == expectedResult)
            }
        }
    }

    @Test("derives correct sprouts per twig")
    func sproutsPerTwig() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let state = deriveState(from: events)

        for (twigId, expectedCount) in fixture.expectedState.sproutsForTwig {
            let sprouts = getSproutsForTwig(from: state, twigId: twigId)
            #expect(sprouts.count == expectedCount)
        }
    }

    @Test("derives correct leaves per twig")
    func leavesPerTwig() throws {
        guard let fixture = loadParityFixture() else {
            Issue.record("Could not load parity fixture")
            return
        }

        let events = convertToSyncEvents(fixture.events)
        let state = deriveState(from: events)

        for (twigId, expectedCount) in fixture.expectedState.leavesForTwig {
            let leaves = getLeavesForTwig(from: state, twigId: twigId)
            #expect(leaves.count == expectedCount)
        }
    }
}

// MARK: - Week Boundary Tests

@Suite("Week Boundary Tests (Monday 6am reset)")
struct WeekBoundaryParityTests {

    @Test("sun_previous_week")
    func sunPreviousWeek() throws {
        guard let fixture = loadWeekBoundaryFixture(),
              let scenario = fixture.scenarios.first(where: { $0.name == "sun_previous_week" }) else {
            Issue.record("Could not load fixture")
            return
        }

        let events = convertToSyncEvents(scenario.events)
        let testDate = ISO8601DateFormatter().date(from: scenario.testTime)!
        let available = deriveSunAvailable(from: events, now: testDate)

        #expect(available == scenario.expected.sunAvailable)
    }

    @Test("sun_this_week")
    func sunThisWeek() throws {
        guard let fixture = loadWeekBoundaryFixture(),
              let scenario = fixture.scenarios.first(where: { $0.name == "sun_this_week" }) else {
            Issue.record("Could not load fixture")
            return
        }

        let events = convertToSyncEvents(scenario.events)
        let testDate = ISO8601DateFormatter().date(from: scenario.testTime)!
        let available = deriveSunAvailable(from: events, now: testDate)

        #expect(available == scenario.expected.sunAvailable)
    }

    @Test("no_sun_this_week")
    func noSunThisWeek() throws {
        guard let fixture = loadWeekBoundaryFixture(),
              let scenario = fixture.scenarios.first(where: { $0.name == "no_sun_this_week" }) else {
            Issue.record("Could not load fixture")
            return
        }

        let events = convertToSyncEvents(scenario.events)
        let testDate = ISO8601DateFormatter().date(from: scenario.testTime)!
        let available = deriveSunAvailable(from: events, now: testDate)

        #expect(available == scenario.expected.sunAvailable)
    }

    @Test("multiple_suns_old_and_current")
    func multipleSunsOldAndCurrent() throws {
        guard let fixture = loadWeekBoundaryFixture(),
              let scenario = fixture.scenarios.first(where: { $0.name == "multiple_suns_old_and_current" }) else {
            Issue.record("Could not load fixture")
            return
        }

        let events = convertToSyncEvents(scenario.events)
        let testDate = ISO8601DateFormatter().date(from: scenario.testTime)!
        let available = deriveSunAvailable(from: events, now: testDate)

        #expect(available == scenario.expected.sunAvailable)
    }
}

// MARK: - Water Boundary Tests

@Suite("Water Boundary Tests (6am daily reset)")
struct WaterBoundaryParityTests {

    @Test("water_yesterday")
    func waterYesterday() throws {
        guard let fixture = loadWeekBoundaryFixture(),
              let scenario = fixture.waterBoundaryTests.first(where: { $0.name == "water_yesterday" }) else {
            Issue.record("Could not load fixture")
            return
        }

        let events = convertToSyncEvents(scenario.events)
        let testDate = ISO8601DateFormatter().date(from: scenario.testTime)!
        let available = deriveWaterAvailable(from: events, now: testDate)

        #expect(available == scenario.expected.waterAvailable)
    }

    @Test("water_today")
    func waterToday() throws {
        guard let fixture = loadWeekBoundaryFixture(),
              let scenario = fixture.waterBoundaryTests.first(where: { $0.name == "water_today" }) else {
            Issue.record("Could not load fixture")
            return
        }

        let events = convertToSyncEvents(scenario.events)
        let testDate = ISO8601DateFormatter().date(from: scenario.testTime)!
        let available = deriveWaterAvailable(from: events, now: testDate)

        #expect(available == scenario.expected.waterAvailable)
    }

    @Test("no_water_today")
    func noWaterToday() throws {
        guard let fixture = loadWeekBoundaryFixture(),
              let scenario = fixture.waterBoundaryTests.first(where: { $0.name == "no_water_today" }) else {
            Issue.record("Could not load fixture")
            return
        }

        let events = convertToSyncEvents(scenario.events)
        let testDate = ISO8601DateFormatter().date(from: scenario.testTime)!
        let available = deriveWaterAvailable(from: events, now: testDate)

        #expect(available == scenario.expected.waterAvailable)
    }
}
