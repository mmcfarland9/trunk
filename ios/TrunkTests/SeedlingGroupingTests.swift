//
//  SeedlingGroupingTests.swift
//  TrunkTests
//
//  Tests for seedlingsGroupedByBranch on SproutsViewModel.
//

import XCTest
@testable import Trunk

final class SeedlingGroupingTests: XCTestCase {
    // NOTE: DerivedSeedling.createdAt is Date, not String — adapted from brief.
    private func seed(_ id: String, _ twigId: String) -> DerivedSeedling {
        DerivedSeedling(id: id, twigId: twigId, title: id, notes: nil, createdAt: Date())
    }

    func testGroupsByBranchSortedAscending() {
        let groups = SproutsViewModel.seedlingsGroupedByBranch([
            seed("a", "branch-2-twig-1"),
            seed("b", "branch-0-twig-3"),
            seed("c", "branch-2-twig-4"),
        ])
        XCTAssertEqual(groups.map { $0.branchIndex }, [0, 2])
        XCTAssertEqual(groups.first { $0.branchIndex == 2 }?.seedlings.map { $0.id }, ["a", "c"])
    }

    func testSkipsUnparseableTwigIds() {
        let groups = SproutsViewModel.seedlingsGroupedByBranch([seed("x", "garbage")])
        XCTAssertTrue(groups.isEmpty)
    }
}
