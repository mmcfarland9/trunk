//
//  BranchView.swift
//  Trunk
//
//  Shows a single branch with its 8 twigs.
//

import SwiftUI
import SwiftData

// Wrapper for sheet presentation with twig index
struct TwigSelection: Identifiable {
    let id: Int
    var index: Int { id }
}

struct BranchView: View {
    let branchIndex: Int
    @Bindable var progression: ProgressionViewModel

    @Environment(\.modelContext) private var modelContext
    @Query private var sprouts: [Sprout]
    @Query private var nodeData: [NodeData]

    @State private var selectedTwig: TwigSelection?

    private let branchNames = [
        "CORE", "BRAIN", "VOICE", "HANDS",
        "HEART", "BREATH", "BACK", "FEET"
    ]

    private let twigCount = TrunkConstants.Tree.twigCount

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: TrunkTheme.space2) {
                    ForEach(0..<twigCount, id: \.self) { twigIndex in
                        let twigId = "branch-\(branchIndex)-twig-\(twigIndex)"
                        let twigSprouts = sproutsForTwig(twigId)

                        Button {
                            selectedTwig = TwigSelection(id: twigIndex)
                        } label: {
                            TwigRow(
                                twigIndex: twigIndex,
                                label: labelForTwig(twigId, twigIndex: twigIndex),
                                activeSproutCount: twigSprouts.filter { $0.state == .active }.count
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(branchNames[branchIndex].uppercased())
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
            }
        }
        .sheet(item: $selectedTwig) { twig in
            NavigationStack {
                TwigDetailView(
                    branchIndex: branchIndex,
                    twigIndex: twig.index,
                    progression: progression
                )
            }
        }
    }

    private func sproutsForTwig(_ twigId: String) -> [Sprout] {
        sprouts.filter { $0.nodeId == twigId }
    }

    private func labelForTwig(_ twigId: String, twigIndex: Int) -> String {
        if let data = nodeData.first(where: { $0.nodeId == twigId }), !data.label.isEmpty {
            return data.label
        }
        return defaultTwigLabels[branchIndex]?[twigIndex] ?? "Twig"
    }

    private var defaultTwigLabels: [Int: [Int: String]] {
        [
            // CORE
            0: [0: "movement", 1: "strength", 2: "sport", 3: "technique", 4: "maintenance", 5: "nutrition", 6: "sleep", 7: "appearance"],
            // BRAIN
            1: [0: "reading", 1: "writing", 2: "reasoning", 3: "focus", 4: "memory", 5: "analysis", 6: "dialogue", 7: "exploration"],
            // VOICE
            2: [0: "practice", 1: "composition", 2: "interpretation", 3: "performance", 4: "consumption", 5: "curation", 6: "completion", 7: "publication"],
            // HANDS
            3: [0: "design", 1: "fabrication", 2: "assembly", 3: "repair", 4: "refinement", 5: "tooling", 6: "tending", 7: "preparation"],
            // HEART
            4: [0: "homemaking", 1: "care", 2: "presence", 3: "intimacy", 4: "communication", 5: "ritual", 6: "adventure", 7: "joy"],
            // BREATH
            5: [0: "observation", 1: "nature", 2: "flow", 3: "repose", 4: "idleness", 5: "exposure", 6: "abstinence", 7: "reflection"],
            // BACK
            6: [0: "connection", 1: "support", 2: "gathering", 3: "membership", 4: "stewardship", 5: "advocacy", 6: "service", 7: "culture"],
            // FEET
            7: [0: "work", 1: "development", 2: "positioning", 3: "ventures", 4: "finance", 5: "operations", 6: "planning", 7: "administration"]
        ]
    }
}

// MARK: - Twig Row

struct TwigRow: View {
    let twigIndex: Int
    let label: String
    let activeSproutCount: Int

    private var hasSprouts: Bool {
        activeSproutCount > 0
    }

    var body: some View {
        HStack(spacing: TrunkTheme.space3) {
            // Left border
            Rectangle()
                .fill(hasSprouts ? Color.twig : Color.border)
                .frame(width: 2)

            VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                // Label with optional asterisk indicator
                HStack(spacing: TrunkTheme.space2) {
                    if hasSprouts {
                        Text("*")
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(Color.twig)
                    }

                    Text(label)
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(hasSprouts ? Color.ink : Color.inkFaint)
                }

                // Sprout counts
                if hasSprouts {
                    Text("\(activeSproutCount) active")
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.twig)
                }
            }

            Spacer()

            Text(">")
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
        .padding(.vertical, TrunkTheme.space3)
        .padding(.horizontal, TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }
}

#Preview {
    NavigationStack {
        BranchView(branchIndex: 0, progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
