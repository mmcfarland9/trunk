//
//  LeafsListView.swift
//  Trunk
//
//  List rendering of filtered leaves with summary bar and search.
//

import SwiftUI

struct LeafsListView: View {
    let leaves: [DerivedLeaf]
    let totalCount: Int
    let state: DerivedState
    @Binding var searchText: String

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space4) {
            // Search bar
            searchBar
                .animatedCard(index: 1)

            // Summary bar
            summaryBar
                .animatedCard(index: 2)

            // Leaf list
            if leaves.isEmpty {
                noMatchState
                    .animatedCard(index: 3)
            } else {
                leafList
                    .animatedCard(index: 3)
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: TrunkTheme.space2) {
            Text("?")
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            TextField("Search leaves...", text: $searchText)
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.ink)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                } label: {
                    Text("x")
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }
            }
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }

    // MARK: - Summary Bar

    private var summaryBar: some View {
        HStack(spacing: TrunkTheme.space4) {
            HStack(spacing: TrunkTheme.space2) {
                Text("\(totalCount)")
                    .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                    .foregroundStyle(Color.ink)

                Text(totalCount == 1 ? "leaf" : "leaves")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            Spacer()
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }

    // MARK: - Leaf List

    private var leafList: some View {
        VStack(spacing: TrunkTheme.space2) {
            ForEach(leaves, id: \.id) { leaf in
                NavigationLink {
                    LeafDetailView(leafId: leaf.id)
                } label: {
                    LeafListRow(leaf: leaf, state: state)
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

            Text("Try a different search.")
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
