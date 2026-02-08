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

    private var nodeId: String {
        "branch-\(branchIndex)-twig-\(twigIndex)"
    }

    private var twigLabel: String {
        SharedConstants.Tree.twigLabel(branchIndex: branchIndex, twigIndex: twigIndex)
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

                    // Harvested section
                    if !completedSprouts.isEmpty {
                        SproutSection(title: "HARVESTED", sprouts: completedSprouts) { sprout in
                            selectedSprout = sprout
                        }
                    }

                    // Empty state
                    if sprouts.isEmpty {
                        VStack(spacing: TrunkTheme.space3) {
                            Text("( )")
                                .font(.system(size: 24, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)

                            Text("No sprouts yet")
                                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)

                            Text("Tap + to plant your first sprout")
                                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, TrunkTheme.space6)
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
                Text(twigLabel.uppercased())
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
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
        .sheet(isPresented: $showingCreateSprout) {
            NavigationStack {
                CreateSproutView(
                    nodeId: nodeId,
                    progression: progression
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

    var body: some View {
        HStack(spacing: TrunkTheme.space3) {
            // State indicator
            Rectangle()
                .fill(borderColor)
                .frame(width: 2)

            VStack(alignment: .leading, spacing: TrunkTheme.space1) {
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
        }
    }
}

#Preview {
    NavigationStack {
        TwigDetailView(branchIndex: 0, twigIndex: 0, progression: ProgressionViewModel())
    }
}
