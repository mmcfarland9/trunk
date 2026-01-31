//
//  DataExportServiceTests.swift
//  TrunkTests
//
//  Tests for data export/import functionality.
//

import Testing
import Foundation
@testable import Trunk

// MARK: - Export Payload Tests

@Suite("ExportPayload")
struct ExportPayloadTests {

    @Test("ExportPayload has correct version")
    func exportPayload_version() {
        let payload = ExportPayload(
            version: 4,
            exportedAt: "2026-01-30T12:00:00Z",
            events: [],
            circles: [:],
            settings: ExportSettings(name: nil)
        )

        #expect(payload.version == 4)
    }

    @Test("ExportPayload encodes to JSON")
    func exportPayload_encodesToJSON() throws {
        let payload = ExportPayload(
            version: 4,
            exportedAt: "2026-01-30T12:00:00Z",
            events: [],
            circles: [:],
            settings: ExportSettings(name: nil)
        )

        let data = try DataExportService.exportToJSON(payload)
        #expect(data.count > 0)
    }

    @Test("ExportPayload decodes from JSON")
    func exportPayload_decodesFromJSON() throws {
        let json = """
        {
            "version": 4,
            "exportedAt": "2026-01-30T12:00:00Z",
            "events": [],
            "circles": {},
            "settings": {}
        }
        """.data(using: .utf8)!

        let payload = try DataExportService.parseImport(json)
        #expect(payload.version == 4)
        #expect(payload.events.isEmpty)
    }
}

// MARK: - TrunkEvent Tests

@Suite("TrunkEvent")
struct TrunkEventTests {

    @Test("leafCreated factory creates correct event")
    func leafCreated_factory() {
        let event = TrunkEvent.leafCreated(
            timestamp: "2026-01-30T12:00:00Z",
            leafId: "leaf-1",
            twigId: "branch-0-twig-0",
            name: "Test Saga"
        )

        #expect(event.type == .leafCreated)
        #expect(event.leafId == "leaf-1")
        #expect(event.twigId == "branch-0-twig-0")
        #expect(event.name == "Test Saga")
    }

    @Test("sproutPlanted factory creates correct event")
    func sproutPlanted_factory() {
        let event = TrunkEvent.sproutPlanted(
            timestamp: "2026-01-30T12:00:00Z",
            sproutId: "sprout-1",
            twigId: "branch-0-twig-0",
            title: "Test Goal",
            season: "2w",
            environment: "fertile",
            soilCost: 2,
            leafId: "leaf-1",
            bloomWither: nil,
            bloomBudding: nil,
            bloomFlourish: nil
        )

        #expect(event.type == .sproutPlanted)
        #expect(event.sproutId == "sprout-1")
        #expect(event.title == "Test Goal")
        #expect(event.season == "2w")
        #expect(event.environment == "fertile")
        #expect(event.soilCost == 2)
    }

    @Test("sproutWatered factory creates correct event")
    func sproutWatered_factory() {
        let event = TrunkEvent.sproutWatered(
            timestamp: "2026-01-30T12:00:00Z",
            sproutId: "sprout-1",
            content: "Made progress",
            prompt: "How did it go?"
        )

        #expect(event.type == .sproutWatered)
        #expect(event.sproutId == "sprout-1")
        #expect(event.content == "Made progress")
        #expect(event.prompt == "How did it go?")
    }

    @Test("sproutHarvested factory creates correct event")
    func sproutHarvested_factory() {
        let event = TrunkEvent.sproutHarvested(
            timestamp: "2026-01-30T12:00:00Z",
            sproutId: "sprout-1",
            result: 4,
            reflection: "Good effort",
            capacityGained: 0.85
        )

        #expect(event.type == .sproutHarvested)
        #expect(event.sproutId == "sprout-1")
        #expect(event.result == 4)
        #expect(event.reflection == "Good effort")
        #expect(event.capacityGained == 0.85)
    }

    @Test("sunShone factory creates correct event")
    func sunShone_factory() {
        let event = TrunkEvent.sunShone(
            timestamp: "2026-01-30T12:00:00Z",
            twigId: "branch-0-twig-0",
            twigLabel: "Movement",
            content: "Reflecting on the week",
            prompt: "What did you learn?"
        )

        #expect(event.type == .sunShone)
        #expect(event.twigId == "branch-0-twig-0")
        #expect(event.twigLabel == "Movement")
        #expect(event.content == "Reflecting on the week")
    }
}

// MARK: - JSON Round-Trip Tests

@Suite("JSON Round-Trip")
struct JSONRoundTripTests {

    @Test("Events survive JSON round-trip")
    func events_roundTrip() throws {
        let originalEvent = TrunkEvent.sproutPlanted(
            timestamp: "2026-01-30T12:00:00Z",
            sproutId: "sprout-1",
            twigId: "branch-0-twig-0",
            title: "Test",
            season: "2w",
            environment: "fertile",
            soilCost: 2,
            leafId: nil,
            bloomWither: "Minimum",
            bloomBudding: "Medium",
            bloomFlourish: "Maximum"
        )

        let payload = ExportPayload(
            version: 4,
            exportedAt: "2026-01-30T12:00:00Z",
            events: [originalEvent],
            circles: [:],
            settings: ExportSettings(name: nil)
        )

        let jsonData = try DataExportService.exportToJSON(payload)
        let decoded = try DataExportService.parseImport(jsonData)

        #expect(decoded.events.count == 1)
        #expect(decoded.events[0].sproutId == "sprout-1")
        #expect(decoded.events[0].title == "Test")
        #expect(decoded.events[0].bloomWither == "Minimum")
    }

    @Test("Circles survive JSON round-trip")
    func circles_roundTrip() throws {
        let circles: [String: CircleData] = [
            "trunk": CircleData(label: "My Life", note: "The journey"),
            "branch-0": CircleData(label: "Health", note: nil)
        ]

        let payload = ExportPayload(
            version: 4,
            exportedAt: "2026-01-30T12:00:00Z",
            events: [],
            circles: circles,
            settings: ExportSettings(name: nil)
        )

        let jsonData = try DataExportService.exportToJSON(payload)
        let decoded = try DataExportService.parseImport(jsonData)

        #expect(decoded.circles["trunk"]?.label == "My Life")
        #expect(decoded.circles["trunk"]?.note == "The journey")
        #expect(decoded.circles["branch-0"]?.label == "Health")
    }

    @Test("Invalid JSON throws error")
    func parseImport_invalidJSON() {
        let invalidData = "not valid json".data(using: .utf8)!

        #expect(throws: Error.self) {
            try DataExportService.parseImport(invalidData)
        }
    }

    @Test("Missing required fields throws error")
    func parseImport_missingFields() {
        let incompleteJSON = """
        {
            "version": 4
        }
        """.data(using: .utf8)!

        #expect(throws: Error.self) {
            try DataExportService.parseImport(incompleteJSON)
        }
    }
}

// MARK: - Event Type Tests

@Suite("TrunkEventType")
struct TrunkEventTypeTests {

    @Test("Event types have correct raw values")
    func eventTypes_rawValues() {
        #expect(TrunkEventType.sproutPlanted.rawValue == "sprout_planted")
        #expect(TrunkEventType.sproutWatered.rawValue == "sprout_watered")
        #expect(TrunkEventType.sproutHarvested.rawValue == "sprout_harvested")
        #expect(TrunkEventType.sproutUprooted.rawValue == "sprout_uprooted")
        #expect(TrunkEventType.sunShone.rawValue == "sun_shone")
        #expect(TrunkEventType.leafCreated.rawValue == "leaf_created")
    }

    @Test("Event types decode from string")
    @MainActor
    func eventTypes_decode() throws {
        let json = """
        {"type": "sprout_planted", "timestamp": "2026-01-30T12:00:00Z"}
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        let event = try decoder.decode(TrunkEvent.self, from: json)

        #expect(event.type == .sproutPlanted)
    }
}
