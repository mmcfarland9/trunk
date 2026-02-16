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

    /// Monotonically increasing counter that views can observe via .onChange
    /// to know when to refresh their local @State caches.
    private(set) var version: Int = 0

    /// Whether the first sync has completed and data is ready to display.
    /// Until this is true, views should not render data-dependent content
    /// (the defaults from an empty EventStore look like real values).
    private(set) var hasLoaded = false

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

    /// Refresh state (invalidate caches and recompute stored values).
    /// Bumps `version` so views observing it via .onChange can refresh
    /// their local @State caches.
    func refresh() {
        EventStore.shared.refresh()
        recompute()
        version += 1
    }

    private func recompute() {
        let state = EventStore.shared.getState()
        soilCapacity = state.soilCapacity
        soilAvailable = state.soilAvailable
        waterAvailable = EventStore.shared.getWaterAvailable()
        sunAvailable = EventStore.shared.getSunAvailable()
    }

    /// Mark data as ready after first sync (success or error fallback).
    func markLoaded() {
        hasLoaded = true
    }

}
