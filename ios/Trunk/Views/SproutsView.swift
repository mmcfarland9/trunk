//
//  SproutsView.swift
//  Trunk
//
//  Sprouts panel: browse, search, and filter all sprouts.
//

import SwiftUI

struct SproutsView: View {
    @Bindable var progression: ProgressionViewModel

    @State private var viewModel = SproutsViewModel()

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            if viewModel.cachedSprouts.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: TrunkTheme.space4) {
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
                    }
                    .padding(TrunkTheme.space4)
                }
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("SPROUTS")
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

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: TrunkTheme.space3) {
            Text("No sprouts yet")
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Text("Plant your first sprout from the Trunk tab to see it here.")
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TrunkTheme.space6)
        .padding(.horizontal, TrunkTheme.space4)
    }
}

// MARK: - Previews

#Preview {
    NavigationStack {
        SproutsView(progression: ProgressionViewModel())
    }
}
