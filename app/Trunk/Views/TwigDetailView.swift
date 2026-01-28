//
//  TwigDetailView.swift
//  Trunk
//
//  Detail view for a single twig showing its sprouts.
//

import SwiftUI
import SwiftData

struct TwigDetailView: View {
    let branchIndex: Int
    let twigIndex: Int
    @Bindable var progression: ProgressionViewModel

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query private var allSprouts: [Sprout]
    @Query private var nodeData: [NodeData]

    @State private var showingCreateSprout = false
    @State private var selectedSprout: Sprout?

    private var nodeId: String {
        "branch-\(branchIndex)-twig-\(twigIndex)"
    }

    private var twigLabel: String {
        if let data = nodeData.first(where: { $0.nodeId == nodeId }), !data.label.isEmpty {
            return data.label
        }
        return defaultTwigLabels[branchIndex]?[twigIndex] ?? "Twig"
    }

    private var defaultTwigLabels: [Int: [Int: String]] {
        [
            0: [0: "movement", 1: "strength", 2: "sport", 3: "technique", 4: "maintenance", 5: "nutrition", 6: "sleep", 7: "appearance"],
            1: [0: "reading", 1: "writing", 2: "reasoning", 3: "focus", 4: "memory", 5: "analysis", 6: "dialogue", 7: "exploration"],
            2: [0: "practice", 1: "composition", 2: "interpretation", 3: "performance", 4: "consumption", 5: "curation", 6: "completion", 7: "publication"],
            3: [0: "design", 1: "fabrication", 2: "assembly", 3: "repair", 4: "refinement", 5: "tooling", 6: "tending", 7: "preparation"],
            4: [0: "homemaking", 1: "care", 2: "presence", 3: "intimacy", 4: "communication", 5: "ritual", 6: "adventure", 7: "joy"],
            5: [0: "observation", 1: "nature", 2: "flow", 3: "repose", 4: "idleness", 5: "exposure", 6: "abstinence", 7: "reflection"],
            6: [0: "connection", 1: "support", 2: "gathering", 3: "membership", 4: "stewardship", 5: "advocacy", 6: "service", 7: "culture"],
            7: [0: "work", 1: "development", 2: "positioning", 3: "ventures", 4: "finance", 5: "operations", 6: "planning", 7: "administration"]
        ]
    }

    private var sprouts: [Sprout] {
        allSprouts.filter { $0.nodeId == nodeId }
    }

    private var draftSprouts: [Sprout] {
        sprouts.filter { $0.state == .draft }
    }

    private var activeSprouts: [Sprout] {
        sprouts.filter { $0.state == .active }
    }

    private var completedSprouts: [Sprout] {
        sprouts.filter { $0.state == .completed || $0.state == .failed }
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                    // Drafts section
                    if !draftSprouts.isEmpty {
                        SproutSection(title: "DRAFTS", sprouts: draftSprouts) { sprout in
                            selectedSprout = sprout
                        }
                    }

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
    let sprouts: [Sprout]
    let onTap: (Sprout) -> Void

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
    let sprout: Sprout

    var body: some View {
        HStack(spacing: TrunkTheme.space3) {
            // State indicator
            Rectangle()
                .fill(borderColor)
                .frame(width: 2)

            VStack(alignment: .leading, spacing: 2) {
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
        .background(Color.paper)
    }

    private var borderColor: Color {
        switch sprout.state {
        case .draft: return Color.inkFaint
        case .active: return Color.twig
        case .completed: return Color(red: 0.4, green: 0.6, blue: 0.4)
        case .failed: return Color(red: 0.6, green: 0.4, blue: 0.35)
        }
    }

    @ViewBuilder
    private var trailingContent: some View {
        switch sprout.state {
        case .draft:
            Text("\(sprout.soilCost) soil")
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.twig)
        case .active:
            if sprout.isReady {
                Text("READY")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.twig)
            } else if let plantedAt = sprout.plantedAt {
                let progress = ProgressionService.progress(plantedAt: plantedAt, season: sprout.season)
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
        case .failed:
            Text("failed")
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
    }
}

#Preview {
    NavigationStack {
        TwigDetailView(branchIndex: 0, twigIndex: 0, progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self], inMemory: true)
}
