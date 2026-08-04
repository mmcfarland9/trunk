//
//  ContinueLeafContext.swift
//  Trunk
//
//  Value types backing "continue a leaf": planting a new sprout into an
//  existing leaf, pre-filled from that leaf's most recent sprout.
//
//  No new event types are involved — continuing a leaf simply produces a
//  normal `sprout_planted` event carrying the existing leafId.
//

import Foundation

/// Editable starting values copied from an existing sprout into the
/// create-sprout form. Every field is only a suggestion — the form owns its
/// own state once prefilled.
struct SproutTemplate {
    let title: String
    let season: Season
    let environment: SproutEnvironment
    let bloomWither: String
    let bloomBudding: String
    let bloomFlourish: String

    init(from sprout: DerivedSprout) {
        self.title = sprout.title
        self.season = sprout.season
        self.environment = sprout.environment
        self.bloomWither = sprout.bloomWither ?? ""
        self.bloomBudding = sprout.bloomBudding ?? ""
        self.bloomFlourish = sprout.bloomFlourish ?? ""
    }
}

/// Identifiable payload for presenting a pre-filled `CreateSproutView` via
/// `.sheet(item:)`. `.sheet(isPresented:)` + `if let` races with the state
/// update and can flash a blank sheet, so callers must use `.sheet(item:)`.
struct ContinueLeafContext: Identifiable {
    let id = UUID()
    /// The twig the leaf lives on — `CreateSproutView` is twig-scoped.
    let twigId: String
    let leafId: String
    /// Nil when the leaf has no sprouts yet: preselect the leaf, prefill nothing.
    let template: SproutTemplate?

    /// Builds the context for continuing `leaf`, templated on the leaf's most
    /// recently planted sprout regardless of that sprout's state.
    init(leaf: DerivedLeaf, state: DerivedState) {
        self.twigId = leaf.twigId
        self.leafId = leaf.id
        self.template = mostRecentSproutForLeaf(from: state, leafId: leaf.id).map(SproutTemplate.init(from:))
    }

    /// Builds the context for continuing the leaf a given sprout belongs to.
    /// Returns nil when the sprout has no resolvable leaf.
    init?(continuing sprout: DerivedSprout, state: DerivedState) {
        guard let leaf = state.leaves[sprout.leafId] else { return nil }
        self.init(leaf: leaf, state: state)
    }
}
