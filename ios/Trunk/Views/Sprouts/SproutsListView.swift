//
//  SproutsListView.swift
//  Trunk
//
//  List rendering of filtered sprouts with summary bar.
//

import SwiftUI

struct SproutsListView: View {
    let sprouts: [DerivedSprout]
    let totalCount: Int
    let activeCount: Int
    let completedCount: Int
    let state: DerivedState

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space4) {
            // Summary bar
            summaryBar
                .animatedCard(index: 0)

            // Sprout list
            if sprouts.isEmpty {
                noMatchState
                    .animatedCard(index: 3)
            } else {
                sproutList
                    .animatedCard(index: 3)
            }
        }
    }

    // MARK: - Summary Bar

    private var summaryBar: some View {
        HStack(spacing: TrunkTheme.space4) {
            HStack(spacing: TrunkTheme.space2) {
                Text("\(totalCount)")
                    .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                    .foregroundStyle(Color.ink)

                Text("total")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            Spacer()

            HStack(spacing: TrunkTheme.space2) {
                Text("\(activeCount)")
                    .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                    .foregroundStyle(Color.twig)

                Text("active")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            HStack(spacing: TrunkTheme.space2) {
                Text("\(completedCount)")
                    .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                    .foregroundStyle(Color.inkLight)

                Text("cultivated")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }

    // MARK: - Sprout List

    private var sproutList: some View {
        LazyVStack(spacing: TrunkTheme.space2) {
            ForEach(sprouts, id: \.id) { sprout in
                NavigationLink {
                    SproutDetailView(sproutId: sprout.id)
                } label: {
                    SproutListRow(sprout: sprout, state: state)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Empty State

    private var noMatchState: some View {
        VStack(spacing: TrunkTheme.space3) {
            Text("No matches")
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Text("Try a different search or filter.")
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TrunkTheme.space5)
        .padding(.horizontal, TrunkTheme.space4)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }
}
