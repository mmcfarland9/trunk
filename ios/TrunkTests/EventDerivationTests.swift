//
//  EventDerivationTests.swift
//  TrunkTests
//
//  Cross-platform parity tests: These tests mirror web/src/tests/derive.test.ts
//  to ensure iOS derives IDENTICAL state from the same events as web.
//

import Testing
import Foundation
@testable import Trunk

// MARK: - Test Helpers

/// Create a SyncEvent for testing (mirrors web's TrunkEvent)
func makeEvent(
    type: String,
    timestamp: String,
    payload: [String: Any]
) -> SyncEvent {
    var payloadDict: [String: AnyCodable] = [:]
    for (key, value) in payload {
        payloadDict[key] = AnyCodable(value)
    }

    return SyncEvent(
        id: UUID(),
        userId: UUID(),
        type: type,
        payload: payloadDict,
        clientId: "test",
        clientTimestamp: timestamp,
        createdAt: timestamp
    )
}

// MARK: - Soil Capacity Tests (mirrors web derive.test.ts)

@Suite("Derive State - Soil Capacity")
struct SoilCapacityTests {

    @Test("calculates soil capacity from harvest events")
    func soilCapacityFromHarvests() {
        // Mirrors web test: 'calculates soil capacity from harvest events'
        let events: [SyncEvent] = [
            makeEvent(type: "sprout_planted", timestamp: "2026-01-01T10:00:00Z", payload: [
                "sproutId": "sprout-1",
                "twigId": "branch-0-twig-0",
                "title": "Test 1",
                "season": "2w",
                "environment": "fertile",
                "soilCost": 2
            ]),
            makeEvent(type: "sprout_harvested", timestamp: "2026-01-15T10:00:00Z", payload: [
                "sproutId": "sprout-1",
                "result": 5,
                "capacityGained": 1.5
            ]),
            makeEvent(type: "sprout_planted", timestamp: "2026-01-16T10:00:00Z", payload: [
                "sproutId": "sprout-2",
                "twigId": "branch-0-twig-0",
                "title": "Test 2",
                "season": "2w",
                "environment": "firm",
                "soilCost": 3
            ]),
            makeEvent(type: "sprout_harvested", timestamp: "2026-01-30T10:00:00Z", payload: [
                "sproutId": "sprout-2",
                "result": 4,
                "capacityGained": 2.0
            ])
        ]

        let state = deriveState(from: events)

        // Starting 10 + 1.5 + 2.0 = 13.5 (same as web)
        #expect(abs(state.soilCapacity - 13.5) < 0.01)
    }

    @Test("calculates soil available after spend and earn")
    func soilAvailableAfterSpendAndEarn() {
        // Mirrors web test: 'calculates soil available after spend and earn'
        let events: [SyncEvent] = [
            makeEvent(type: "sprout_planted", timestamp: "2026-01-01T10:00:00Z", payload: [
                "sproutId": "sprout-1",
                "twigId": "branch-0-twig-0",
                "title": "Test",
                "season": "2w",
                "environment": "fertile",
                "soilCost": 5
            ]),
            makeEvent(type: "sprout_watered", timestamp: "2026-01-02T10:00:00Z", payload: [
                "sproutId": "sprout-1",
                "content": "Progress"
            ]),
            makeEvent(type: "sun_shone", timestamp: "2026-01-03T10:00:00Z", payload: [
                "twigId": "branch-0-twig-0",
                "twigLabel": "Test",
                "content": "Reflection"
            ])
        ]

        let state = deriveState(from: events)

        // 10 - 5 (plant) + 0.05 (water) + 0.35 (sun) = 5.40 (same as web)
        #expect(abs(state.soilAvailable - 5.4) < 0.01)
    }
}

// MARK: - Water Available Tests

@Suite("Derive Water Available")
struct WaterAvailableTests {

    @Test("returns 3 minus today's waters")
    func waterMinusTodaysWaters() {
        // Set time to 2pm on Jan 30 (same as web test)
        var calendar = Calendar.current
        calendar.timeZone = TimeZone.current
        let now = calendar.date(from: DateComponents(year: 2026, month: 1, day: 30, hour: 14, minute: 0, second: 0))!

        let events: [SyncEvent] = [
            makeEvent(type: "sprout_watered", timestamp: formatISO8601(calendar.date(from: DateComponents(year: 2026, month: 1, day: 30, hour: 9))!), payload: [
                "sproutId": "sprout-1",
                "content": "First"
            ]),
            makeEvent(type: "sprout_watered", timestamp: formatISO8601(calendar.date(from: DateComponents(year: 2026, month: 1, day: 30, hour: 11))!), payload: [
                "sproutId": "sprout-2",
                "content": "Second"
            ])
        ]

        let available = deriveWaterAvailable(from: events, now: now)
        #expect(available == 1) // 3 - 2 = 1 (same as web)
    }

    @Test("resets at 6am")
    func waterResetsAt6am() {
        // Set time to 7am on Jan 30 (same as web test)
        var calendar = Calendar.current
        calendar.timeZone = TimeZone.current
        let now = calendar.date(from: DateComponents(year: 2026, month: 1, day: 30, hour: 7, minute: 0, second: 0))!

        let events: [SyncEvent] = [
            // Watered yesterday at 10pm
            makeEvent(type: "sprout_watered", timestamp: formatISO8601(calendar.date(from: DateComponents(year: 2026, month: 1, day: 29, hour: 22))!), payload: [
                "sproutId": "sprout-1",
                "content": "Yesterday late"
            ]),
            // Watered yesterday at 3am
            makeEvent(type: "sprout_watered", timestamp: formatISO8601(calendar.date(from: DateComponents(year: 2026, month: 1, day: 29, hour: 3))!), payload: [
                "sproutId": "sprout-2",
                "content": "Very early"
            ])
        ]

        let available = deriveWaterAvailable(from: events, now: now)
        #expect(available == 3) // All yesterday's waters don't count (same as web)
    }
}

// MARK: - Sun Available Tests

@Suite("Derive Sun Available")
struct SunAvailableTests {

    @Test("returns 1 minus this week's suns")
    func sunMinusThisWeeksSuns() {
        // Wednesday Jan 29, 2026 at 2pm (same as web test)
        let now = ISO8601DateFormatter().date(from: "2026-01-29T14:00:00Z")!

        let events: [SyncEvent] = [
            makeEvent(type: "sun_shone", timestamp: "2026-01-27T10:00:00Z", payload: [ // Monday
                "twigId": "branch-0-twig-0",
                "twigLabel": "Test",
                "content": "Reflection"
            ])
        ]

        let available = deriveSunAvailable(from: events, now: now)
        #expect(available == 0) // 1 - 1 = 0 (same as web)
    }

    @Test("resets on week boundary")
    func sunResetsOnWeekBoundary() {
        // Wednesday Jan 29, 2026 at 2pm
        let now = ISO8601DateFormatter().date(from: "2026-01-29T14:00:00Z")!

        let events: [SyncEvent] = [
            // Last Saturday (before this week's reset)
            makeEvent(type: "sun_shone", timestamp: "2026-01-25T10:00:00Z", payload: [
                "twigId": "branch-0-twig-0",
                "twigLabel": "Test",
                "content": "Last week"
            ])
        ]

        let available = deriveSunAvailable(from: events, now: now)
        #expect(available == 1) // Last week doesn't count (same as web)
    }
}

// MARK: - Sprout Filtering Tests

@Suite("getSproutsForTwig")
struct SproutsForTwigTests {

    @Test("filters by twigId")
    func filtersByTwigId() {
        let events: [SyncEvent] = [
            makeEvent(type: "sprout_planted", timestamp: "2026-01-01T10:00:00Z", payload: [
                "sproutId": "sprout-1",
                "twigId": "branch-0-twig-0",
                "title": "First Twig",
                "season": "2w",
                "environment": "fertile",
                "soilCost": 2
            ]),
            makeEvent(type: "sprout_planted", timestamp: "2026-01-01T11:00:00Z", payload: [
                "sproutId": "sprout-2",
                "twigId": "branch-0-twig-1",
                "title": "Second Twig",
                "season": "2w",
                "environment": "fertile",
                "soilCost": 2
            ]),
            makeEvent(type: "sprout_planted", timestamp: "2026-01-01T12:00:00Z", payload: [
                "sproutId": "sprout-3",
                "twigId": "branch-0-twig-0",
                "title": "First Twig Again",
                "season": "2w",
                "environment": "fertile",
                "soilCost": 2
            ])
        ]

        let state = deriveState(from: events)
        let twig0Sprouts = getSproutsForTwig(from: state, twigId: "branch-0-twig-0")

        #expect(twig0Sprouts.count == 2)
        #expect(twig0Sprouts.contains { $0.id == "sprout-1" })
        #expect(twig0Sprouts.contains { $0.id == "sprout-3" })
    }
}

// MARK: - Leaf Filtering Tests

@Suite("getLeavesForTwig")
struct LeavesForTwigTests {

    @Test("filters by twigId")
    func filtersByTwigId() {
        let events: [SyncEvent] = [
            makeEvent(type: "leaf_created", timestamp: "2026-01-01T10:00:00Z", payload: [
                "leafId": "leaf-1",
                "twigId": "branch-0-twig-0",
                "name": "Saga 1"
            ]),
            makeEvent(type: "leaf_created", timestamp: "2026-01-01T11:00:00Z", payload: [
                "leafId": "leaf-2",
                "twigId": "branch-1-twig-0",
                "name": "Saga 2"
            ]),
            makeEvent(type: "leaf_created", timestamp: "2026-01-01T12:00:00Z", payload: [
                "leafId": "leaf-3",
                "twigId": "branch-0-twig-0",
                "name": "Saga 3"
            ])
        ]

        let state = deriveState(from: events)
        let twig0Leaves = getLeavesForTwig(from: state, twigId: "branch-0-twig-0")

        #expect(twig0Leaves.count == 2)
        #expect(twig0Leaves.contains { $0.name == "Saga 1" })
        #expect(twig0Leaves.contains { $0.name == "Saga 3" })
    }
}

// MARK: - Active/Completed Sprouts Tests

@Suite("getActiveSprouts")
struct ActiveSproutsTests {

    @Test("returns only active sprouts")
    func returnsOnlyActive() {
        let events: [SyncEvent] = [
            makeEvent(type: "sprout_planted", timestamp: "2026-01-01T10:00:00Z", payload: [
                "sproutId": "active-1",
                "twigId": "branch-0-twig-0",
                "title": "Active 1",
                "season": "2w",
                "environment": "fertile",
                "soilCost": 2
            ]),
            makeEvent(type: "sprout_planted", timestamp: "2026-01-01T11:00:00Z", payload: [
                "sproutId": "completed-1",
                "twigId": "branch-0-twig-0",
                "title": "Completed 1",
                "season": "2w",
                "environment": "fertile",
                "soilCost": 2
            ]),
            makeEvent(type: "sprout_harvested", timestamp: "2026-01-15T10:00:00Z", payload: [
                "sproutId": "completed-1",
                "result": 4,
                "capacityGained": 0.5
            ])
        ]

        let state = deriveState(from: events)
        let active = getActiveSprouts(from: state)

        #expect(active.count == 1)
        #expect(active[0].id == "active-1")
    }
}

@Suite("getCompletedSprouts")
struct CompletedSproutsTests {

    @Test("returns only completed sprouts")
    func returnsOnlyCompleted() {
        let events: [SyncEvent] = [
            makeEvent(type: "sprout_planted", timestamp: "2026-01-01T10:00:00Z", payload: [
                "sproutId": "active-1",
                "twigId": "branch-0-twig-0",
                "title": "Active",
                "season": "2w",
                "environment": "fertile",
                "soilCost": 2
            ]),
            makeEvent(type: "sprout_planted", timestamp: "2026-01-01T11:00:00Z", payload: [
                "sproutId": "completed-1",
                "twigId": "branch-0-twig-0",
                "title": "Completed",
                "season": "2w",
                "environment": "fertile",
                "soilCost": 2
            ]),
            makeEvent(type: "sprout_harvested", timestamp: "2026-01-15T10:00:00Z", payload: [
                "sproutId": "completed-1",
                "result": 5,
                "capacityGained": 0.5
            ])
        ]

        let state = deriveState(from: events)
        let completed = getCompletedSprouts(from: state)

        #expect(completed.count == 1)
        #expect(completed[0].id == "completed-1")
    }
}

// MARK: - Helpers

private func formatISO8601(_ date: Date) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.string(from: date)
}
