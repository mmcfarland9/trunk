//
//  SproutsViewModel.swift
//  Trunk
//
//  View model for sprouts filtering, sorting, and search state.
//

import SwiftUI

@Observable
class SproutsViewModel {
    var searchText = ""
    var selectedFilter: SproutFilter = .all
    var selectedSort: SproutSort = .planted

    var cachedSprouts: [DerivedSprout] = []
    var cachedLeaves: [DerivedLeaf] = []
    var cachedState: DerivedState? = nil

    func refreshCachedState() {
        let state = EventStore.shared.getState()
        cachedState = state
        cachedSprouts = Array(state.sprouts.values)
        cachedLeaves = Array(state.leaves.values)
        // Pre-compute counts to avoid repeated array scans in view bodies
        activeCount = cachedSprouts.filter { $0.state == .active }.count
        completedCount = cachedSprouts.filter { $0.state == .completed }.count
    }

    func filteredSprouts() -> [DerivedSprout] {
        var sprouts = cachedSprouts

        // Apply status filter
        switch selectedFilter {
        case .all:
            break
        case .active:
            sprouts = sprouts.filter { $0.state == .active }
        case .completed:
            sprouts = sprouts.filter { $0.state == .completed }
        case .uprooted:
            sprouts = sprouts.filter { $0.state == .uprooted }
        }

        // Apply search (case-insensitive against sprout title and leaf name)
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            let query = trimmed.lowercased()
            let leaves = cachedState?.leaves ?? [:]
            sprouts = sprouts.filter { sprout in
                if sprout.title.lowercased().contains(query) {
                    return true
                }
                if let leaf = leaves[sprout.leafId],
                   leaf.name.lowercased().contains(query) {
                    return true
                }
                return false
            }
        }

        // Apply sort
        switch selectedSort {
        case .planted:
            sprouts.sort { $0.plantedAt > $1.plantedAt }
        case .alphabetical:
            sprouts.sort { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        case .status:
            sprouts.sort { sprout1, sprout2 in
                if sprout1.state != sprout2.state {
                    return sprout1.state == .active
                }
                return sprout1.plantedAt > sprout2.plantedAt
            }
        }

        return sprouts
    }

    // Pre-computed in refreshCachedState() to avoid repeated array scans
    var activeCount: Int = 0
    var completedCount: Int = 0

    var leafCount: Int {
        cachedLeaves.count
    }

    func filteredLeaves() -> [DerivedLeaf] {
        var leaves = cachedLeaves

        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            let query = trimmed.lowercased()
            leaves = leaves.filter { $0.name.lowercased().contains(query) }
        }

        leaves.sort { $0.createdAt > $1.createdAt }

        return leaves
    }
}
