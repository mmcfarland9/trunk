//
//  ResourceStateTests.swift
//  TrunkTests
//
//  Tests for ResourceState struct (pure data, no SwiftData).
//

import Testing
import Foundation
@testable import Trunk

@Suite("ResourceState")
struct ResourceStateTests {

    @Test("Default state has correct starting values")
    @MainActor
    func defaultState_hasCorrectValues() {
        let state = ResourceState.defaultState

        // Soil
        #expect(state.soilCapacity == 10.0)
        #expect(state.soilAvailable == 10.0)

        // Water (capacity is constant TrunkConstants.Water.dailyCapacity = 3)
        #expect(state.waterAvailable == 3)

        // Sun (capacity is constant TrunkConstants.Sun.weeklyCapacity = 1)
        #expect(state.sunAvailable == 1)
    }

    @Test("ResourceState is Codable")
    @MainActor
    func resourceState_isCodable() throws {
        let state = ResourceState.defaultState

        let encoder = JSONEncoder()
        let data = try encoder.encode(state)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(ResourceState.self, from: data)

        #expect(decoded.soilCapacity == state.soilCapacity)
        #expect(decoded.soilAvailable == state.soilAvailable)
        #expect(decoded.waterAvailable == state.waterAvailable)
        #expect(decoded.sunAvailable == state.sunAvailable)
    }
}

// MARK: - TrunkConstants Tests

@Suite("TrunkConstants")
struct TrunkConstantsTests {

    @Test("Soil starting capacity is 10")
    func soil_startingCapacity() {
        #expect(TrunkConstants.Soil.startingCapacity == 10.0)
    }

    @Test("Soil max capacity is 120")
    func soil_maxCapacity() {
        #expect(TrunkConstants.Soil.maxCapacity == 120.0)
    }

    @Test("Water daily capacity is 3")
    func water_dailyCapacity() {
        #expect(TrunkConstants.Water.dailyCapacity == 3)
    }

    @Test("Sun weekly capacity is 1")
    func sun_weeklyCapacity() {
        #expect(TrunkConstants.Sun.weeklyCapacity == 1)
    }

    @Test("Water reset hour is 6 AM")
    func water_resetHour() {
        #expect(TrunkConstants.Water.resetHour == 6)
    }

    @Test("Sun reset hour is 6 AM")
    func sun_resetHour() {
        #expect(TrunkConstants.Sun.resetHour == 6)
    }

    @Test("Tree has 8 branches")
    func tree_branchCount() {
        #expect(TrunkConstants.Tree.branchCount == 8)
    }

    @Test("Tree has 8 twigs per branch")
    func tree_twigCount() {
        #expect(TrunkConstants.Tree.twigCount == 8)
    }

    @Test("Planting costs are defined for all seasons")
    func plantingCosts_allSeasons() {
        #expect(TrunkConstants.Soil.plantingCosts["2w"] != nil)
        #expect(TrunkConstants.Soil.plantingCosts["1m"] != nil)
        #expect(TrunkConstants.Soil.plantingCosts["3m"] != nil)
        #expect(TrunkConstants.Soil.plantingCosts["6m"] != nil)
        #expect(TrunkConstants.Soil.plantingCosts["1y"] != nil)
    }

    @Test("Base rewards are defined for all seasons")
    func baseRewards_allSeasons() {
        #expect(SharedConstants.Seasons.baseRewards["2w"] != nil)
        #expect(SharedConstants.Seasons.baseRewards["1m"] != nil)
        #expect(SharedConstants.Seasons.baseRewards["3m"] != nil)
        #expect(SharedConstants.Seasons.baseRewards["6m"] != nil)
        #expect(SharedConstants.Seasons.baseRewards["1y"] != nil)
    }

    @Test("Environment multipliers are defined")
    func environmentMultipliers_defined() {
        #expect(TrunkConstants.Soil.environmentMultipliers["fertile"] != nil)
        #expect(TrunkConstants.Soil.environmentMultipliers["firm"] != nil)
        #expect(TrunkConstants.Soil.environmentMultipliers["barren"] != nil)
    }

    @Test("Result multipliers are defined for 1-5")
    func resultMultipliers_defined() {
        #expect(TrunkConstants.Soil.resultMultipliers[1] != nil)
        #expect(TrunkConstants.Soil.resultMultipliers[2] != nil)
        #expect(TrunkConstants.Soil.resultMultipliers[3] != nil)
        #expect(TrunkConstants.Soil.resultMultipliers[4] != nil)
        #expect(TrunkConstants.Soil.resultMultipliers[5] != nil)
    }
}
