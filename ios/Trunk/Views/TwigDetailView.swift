//
//  TwigDetailView.swift
//  Trunk
//
//  Detail view for a single twig showing its sprouts.
//

import SwiftUI

struct TwigDetailView: View {
    let branchIndex: Int
    let twigIndex: Int
    @Bindable var progression: ProgressionViewModel

    @Environment(\.dismiss) private var dismiss

    @State private var showingCreateSprout = false
    @State private var selectedSprout: DerivedSprout?
    @State private var plantFromSeedling: (title: String, seedlingId: String)?

    private var nodeId: String {
        "branch-\(branchIndex)-twig-\(twigIndex)"
    }

    private var twigLabel: String {
        SharedConstants.Tree.twigLabel(branchIndex: branchIndex, twigIndex: twigIndex)
    }

    /// Ornamental subtitle (synonyms) for this twig, e.g. "locomotion; ambulation; cardio".
    /// Mirrors how BranchView surfaces branchDescriptions. Bounds-safe; "" if out of range.
    private var twigSubtitle: String {
        let descriptions = SharedConstants.Tree.twigDescriptions
        guard branchIndex >= 0, branchIndex < descriptions.count,
              twigIndex >= 0, twigIndex < descriptions[branchIndex].count else { return "" }
        return descriptions[branchIndex][twigIndex]
    }

    // Derived state from EventStore
    private var state: DerivedState {
        EventStore.shared.getState()
    }

    private var sprouts: [DerivedSprout] {
        getSproutsForTwig(from: state, twigId: nodeId)
    }

    private var activeSprouts: [DerivedSprout] {
        sprouts.filter { $0.state == .active }
    }

    private var completedSprouts: [DerivedSprout] {
        sprouts.filter { $0.state == .completed }
    }

    private var twigSeedlings: [DerivedSeedling] {
        getSeedlingsForTwig(from: state, twigId: nodeId)
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                    // Growing section
                    if !activeSprouts.isEmpty {
                        SproutSection(title: "GROWING", sprouts: activeSprouts) { sprout in
                            selectedSprout = sprout
                        }
                    }

                    // Seedlings section
                    SeedlingsSection(
                        twigId: nodeId,
                        seedlings: twigSeedlings,
                        onPlant: { seedling in
                            plantFromSeedling = (title: seedling.title, seedlingId: seedling.id)
                            showingCreateSprout = true
                        },
                        onRefresh: {
                            progression.refresh()
                        }
                    )

                    // Harvested section
                    if !completedSprouts.isEmpty {
                        SproutSection(title: "HARVESTED", sprouts: completedSprouts) { sprout in
                            selectedSprout = sprout
                        }
                    }

                }
                .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") {
                    dismiss()
                }
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
            }
            ToolbarItem(placement: .principal) {
                VStack(spacing: 1) {
                    Text(twigLabel.uppercased())
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .tracking(2)
                        .foregroundStyle(Color.wood)

                    if !twigSubtitle.isEmpty {
                        Text(twigSubtitle)
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showingCreateSprout = true
                } label: {
                    Text("+")
                        .font(.system(size: 20, design: .monospaced))
                        .foregroundStyle(Color.wood)
                }
            }
        }
        .sheet(isPresented: $showingCreateSprout, onDismiss: {
            plantFromSeedling = nil
        }) {
            NavigationStack {
                CreateSproutView(
                    nodeId: nodeId,
                    progression: progression,
                    initialTitle: plantFromSeedling?.title,
                    plantingSeedlingId: plantFromSeedling?.seedlingId
                )
            }
        }
        .sheet(item: $selectedSprout) { sprout in
            NavigationStack {
                SproutActionsView(
                    sprout: sprout,
                    progression: progression
                )
            }
        }
    }
}

// MARK: - Sprout Section

struct SproutSection: View {
    let title: String
    let sprouts: [DerivedSprout]
    let onTap: (DerivedSprout) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text(title)
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 1) {
                ForEach(sprouts, id: \.id) { sprout in
                    Button {
                        onTap(sprout)
                    } label: {
                        SproutRow(sprout: sprout)
                    }
                    .buttonStyle(.plain)
                }
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }
}

// MARK: - Sprout Row

struct SproutRow: View {
    let sprout: DerivedSprout

    private var leafName: String? {
        EventStore.shared.getState().leaves[sprout.leafId]?.name
    }

    /// Where this sprout sits in its leaf's series, so an ongoing saga doesn't
    /// read as a standalone goal. Counts come from EventDerivation's
    /// countLeafProgress — the same rule web uses, guarded by parity tests.
    private var leafProgressLabel: String {
        let sprouts = getSproutsForLeaf(from: EventStore.shared.getState(), leafId: sprout.leafId)
        let progress = countLeafProgress(sprouts)
        var parts: [String] = []
        if progress.done > 0 { parts.append("\(progress.done) done") }
        if progress.growing > 0 { parts.append("\(progress.growing) growing") }
        return parts.joined(separator: " · ")
    }

    var body: some View {
        HStack(spacing: TrunkTheme.space3) {
            // State indicator
            Rectangle()
                .fill(borderColor)
                .frame(width: 2)

            VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                if let leafName {
                    HStack(spacing: TrunkTheme.space2) {
                        Text(leafName)
                            .font(.system(size: TrunkTheme.textSm, weight: .medium, design: .monospaced))
                            .foregroundStyle(Color.wood)
                            .lineLimit(1)

                        Text(leafProgressLabel)
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                }

                Text(sprout.title)
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.ink)
                    .lineLimit(1)

                HStack(spacing: TrunkTheme.space2) {
                    Text(sprout.season.label)
                    Text("·")
                    Text(sprout.environment.label)
                }
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
            }

            Spacer()

            // Trailing content
            trailingContent
        }
        .padding(.vertical, TrunkTheme.space2)
        .padding(.horizontal, TrunkTheme.space3)
        .frame(minHeight: 44)
        .background(Color.paper)
    }

    private var borderColor: Color {
        switch sprout.state {
        case .active: return Color.twig
        case .completed: return Color.trunkSuccess
        case .uprooted: return Color.trunkDestructive
        }
    }

    @ViewBuilder
    private var trailingContent: some View {
        switch sprout.state {
        case .active:
            if isSproutReady(sprout) {
                Text("READY")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.twig)
            } else {
                let progress = ProgressionService.progress(plantedAt: sprout.plantedAt, season: sprout.season)
                Text("\(Int(progress * 100))%")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }
        case .completed:
            if let result = sprout.result {
                Text(String(repeating: "★", count: result) + String(repeating: "☆", count: 5 - result))
                    .font(.system(size: TrunkTheme.textXs))
                    .foregroundStyle(Color.trunkSun)
            }
        case .uprooted:
            Text("UPROOTED")
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.trunkDestructive)
        }
    }
}

#Preview {
    NavigationStack {
        TwigDetailView(branchIndex: 0, twigIndex: 0, progression: ProgressionViewModel())
    }
}
