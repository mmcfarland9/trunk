//
//  SproutsView.swift
//  Trunk
//
//  Sprouts panel: browse, search, and filter all sprouts and leaves.
//

import SwiftUI

enum BrowseMode: String, CaseIterable {
    case sprouts = "Sprouts"
    case leaves = "Leaves"
}

struct SproutsView: View {
    @Bindable var progression: ProgressionViewModel

    @State private var viewModel = SproutsViewModel()
    @State private var selectedMode: BrowseMode = .sprouts

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                    // Sprouts / Leaves toggle
                    modeToggle

                    if selectedMode == .sprouts {
                        // Filter bar (search + filters + sort)
                        SproutFilterBar(viewModel: viewModel)

                        // Sprout list with summary
                        SproutsListView(
                            sprouts: viewModel.filteredSprouts(),
                            totalCount: viewModel.cachedSprouts.count,
                            activeCount: viewModel.activeCount,
                            completedCount: viewModel.completedCount,
                            state: viewModel.cachedState ?? EventStore.shared.getState()
                        )
                    } else {
                        // Leaf list with summary
                        LeavesListView(
                            leaves: viewModel.filteredLeaves(),
                            totalCount: viewModel.leafCount,
                            state: viewModel.cachedState ?? EventStore.shared.getState(),
                            searchText: $viewModel.searchText
                        )
                    }
                }
                .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("GARDEN")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
            }
        }
        .onAppear {
            viewModel.refreshCachedState()
        }
        .onChange(of: progression.version) {
            viewModel.refreshCachedState()
        }
    }

    // MARK: - Mode Toggle

    private var modeToggle: some View {
        HStack(spacing: TrunkTheme.space1) {
            ForEach(BrowseMode.allCases, id: \.self) { mode in
                Button {
                    HapticManager.tap()
                    selectedMode = mode
                } label: {
                    Text(mode.rawValue)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(selectedMode == mode ? Color.wood : Color.inkFaint)
                        .padding(.horizontal, TrunkTheme.space2)
                        .padding(.vertical, TrunkTheme.space1)
                        .background(selectedMode == mode ? Color.wood.opacity(0.08) : Color.clear)
                        .overlay(
                            Rectangle()
                                .stroke(selectedMode == mode ? Color.wood : Color.border, lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }

            Spacer()
        }
    }

}

// MARK: - Previews

#Preview {
    NavigationStack {
        SproutsView(progression: ProgressionViewModel())
    }
}
