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
    var cachedState: DerivedState? = nil

    func refreshCachedState() {
        let state = EventStore.shared.getState()
        cachedState = state
        cachedSprouts = Array(state.sprouts.values)
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

    var activeCount: Int {
        cachedSprouts.filter { $0.state == .active }.count
    }

    var completedCount: Int {
        cachedSprouts.filter { $0.state == .completed }.count
    }
}
