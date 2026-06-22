//
//  SproutsView.swift
//  Trunk
//
//  Sprouts panel: browse, search, and filter all sprouts and leaves.
//

import SwiftUI

enum BrowseMode: String, CaseIterable {
    case sprouts = "Sprouts"
    case seedlings = "Seedlings"
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

                    switch selectedMode {
                    case .sprouts:
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
                    case .seedlings:
                        SeedlingsListView(
                            seedlings: viewModel.cachedSeedlings,
                            groups: SproutsViewModel.seedlingsGroupedByBranch(viewModel.cachedSeedlings),
                            progression: progression,
                            onChanged: { viewModel.refreshCachedState() }
                        )
                    case .leaves:
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

// MARK: - Seedlings List View

struct SeedlingsListView: View {
    let seedlings: [DerivedSeedling]
    let groups: [SeedlingBranchGroup]
    @Bindable var progression: ProgressionViewModel
    let onChanged: () -> Void

    @State private var expanded: Set<Int> = []
    @State private var didInitExpansion = false
    @State private var plantFrom: (title: String, twigId: String, seedlingId: String)?
    @State private var showingPlant = false

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("\(seedlings.count) seedling\(seedlings.count == 1 ? "" : "s")")
                .monoLabel(size: TrunkTheme.textXs)

            if seedlings.isEmpty {
                Text("No seedlings yet. Add ideas from a twig detail view.")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .padding(.vertical, TrunkTheme.space4)
            } else {
                ForEach(groups) { group in
                    branchSection(group)
                }
            }
        }
        .onAppear {
            if !didInitExpansion {
                expanded = Set(groups.map { $0.branchIndex })
                didInitExpansion = true
            }
        }
        .sheet(isPresented: $showingPlant, onDismiss: { plantFrom = nil; onChanged() }) {
            if let plantFrom {
                NavigationStack {
                    CreateSproutView(
                        nodeId: plantFrom.twigId,
                        progression: progression,
                        initialTitle: plantFrom.title,
                        plantingSeedlingId: plantFrom.seedlingId
                    )
                }
            }
        }
    }

    @ViewBuilder
    private func branchSection(_ group: SeedlingBranchGroup) -> some View {
        let isOpen = expanded.contains(group.branchIndex)
        VStack(alignment: .leading, spacing: 1) {
            Button {
                if isOpen { expanded.remove(group.branchIndex) } else { expanded.insert(group.branchIndex) }
            } label: {
                HStack {
                    Text(group.branchName)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.wood)
                    Text("(\(group.seedlings.count))")
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                    Spacer()
                    Text(isOpen ? "▼" : "▶")
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }
                .padding(.vertical, TrunkTheme.space2)
            }
            .buttonStyle(.plain)

            if isOpen {
                VStack(spacing: 1) {
                    ForEach(group.seedlings) { seedling in
                        SeedlingCardView(
                            seedling: seedling,
                            onPlant: {
                                plantFrom = (seedling.title, seedling.twigId, seedling.id)
                                showingPlant = true
                            },
                            onEdit: { title, notes in editSeedling(seedling.id, title: title, notes: notes) },
                            onDelete: { deleteSeedling(seedling.id) }
                        )
                        .padding(.horizontal, TrunkTheme.space3)
                    }
                }
                .background(Color.paper)
                .overlay(Rectangle().stroke(Color.border, lineWidth: 1))
            }
        }
    }

    private func editSeedling(_ id: String, title: String, notes: String?) {
        Task {
            do {
                var payload: [String: JSONValue] = [
                    "seedlingId": .string(id),
                    "title": .string(String(title.prefix(SharedConstants.Validation.maxSeedlingTitleLength))),
                ]
                if let notes { payload["notes"] = .string(notes) }
                try await SyncService.shared.pushEvent(type: "seedling_edited", payload: payload)
            } catch { print("[SeedlingsListView] edit failed: \(error)") }
            onChanged()
        }
    }

    private func deleteSeedling(_ id: String) {
        Task {
            do {
                try await SyncService.shared.pushEvent(
                    type: "seedling_deleted",
                    payload: ["seedlingId": .string(id)]
                )
            } catch { print("[SeedlingsListView] delete failed: \(error)") }
            onChanged()
        }
    }
}

// MARK: - Previews

#Preview {
    NavigationStack {
        SproutsView(progression: ProgressionViewModel())
    }
}
