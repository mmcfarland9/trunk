//
//  ProgressionViewModel.swift
//  Trunk
//
//  Observable state derived from EventStore - no local storage.
//

import Foundation

@Observable
final class ProgressionViewModel {

    init() {}

    // MARK: - Derived State Access

    private var state: DerivedState {
        EventStore.shared.getState()
    }

    // MARK: - Soil

    var soilCapacity: Double {
        state.soilCapacity
    }

    var soilAvailable: Double {
        state.soilAvailable
    }

    var soilCapacityInt: Int {
        Int(state.soilCapacity.rounded())
    }

    var soilAvailableInt: Int {
        Int(state.soilAvailable.rounded())
    }

    func canAfford(cost: Int) -> Bool {
        soilAvailable >= Double(cost)
    }

    // MARK: - Water

    var waterAvailable: Int {
        EventStore.shared.getWaterAvailable()
    }

    var waterCapacity: Int {
        SharedConstants.Water.dailyCapacity
    }

    var canWater: Bool {
        waterAvailable > 0
    }

    // MARK: - Sun

    var sunAvailable: Int {
        EventStore.shared.getSunAvailable()
    }

    var sunCapacity: Int {
        SharedConstants.Sun.weeklyCapacity
    }

    var canShine: Bool {
        sunAvailable > 0
    }

    // MARK: - Refresh

    /// Refresh state (invalidate caches for time-based resources)
    func refresh() {
        EventStore.shared.refresh()
    }

    // MARK: - Debug

    func resetToDefaults() {
        // Clear local events - would need to clear cloud too for real reset
        EventStore.shared.clearEvents()
    }
}
