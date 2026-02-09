//
//  ProgressionViewModel.swift
//  Trunk
//
//  Observable state derived from EventStore - no local storage.
//

import Foundation

@Observable
final class ProgressionViewModel {

    // MARK: - Cached Values

    private(set) var soilCapacity: Double = SharedConstants.Soil.startingCapacity
    private(set) var soilAvailable: Double = SharedConstants.Soil.startingCapacity
    private(set) var waterAvailable: Int = SharedConstants.Water.dailyCapacity
    private(set) var sunAvailable: Int = SharedConstants.Sun.weeklyCapacity

    init() {
        recompute()
    }

    // MARK: - Derived (cheap, from cached values)

    var soilCapacityInt: Int {
        Int(soilCapacity.rounded())
    }

    var soilAvailableInt: Int {
        Int(soilAvailable.rounded())
    }

    func canAfford(cost: Int) -> Bool {
        soilAvailable >= Double(cost)
    }

    var waterCapacity: Int {
        SharedConstants.Water.dailyCapacity
    }

    var canWater: Bool {
        waterAvailable > 0
    }

    var sunCapacity: Int {
        SharedConstants.Sun.weeklyCapacity
    }

    var canShine: Bool {
        sunAvailable > 0
    }

    // MARK: - Refresh

    /// Refresh state (invalidate caches and recompute stored values)
    func refresh() {
        EventStore.shared.refresh()
        recompute()
    }

    private func recompute() {
        let state = EventStore.shared.getState()
        soilCapacity = state.soilCapacity
        soilAvailable = state.soilAvailable
        waterAvailable = EventStore.shared.getWaterAvailable()
        sunAvailable = EventStore.shared.getSunAvailable()
    }

    // MARK: - Debug

    func resetToDefaults() {
        EventStore.shared.clearEvents()
        recompute()
    }
}
