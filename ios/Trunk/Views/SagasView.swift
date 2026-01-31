//
//  SagasView.swift
//  Trunk
//
//  Lists all leaves (sagas) for navigation to their timelines.
//

import SwiftUI
import SwiftData

struct SagasView: View {
    @Bindable var progression: ProgressionViewModel

    @Query(sort: \Leaf.createdAt, order: .reverse) private var leaves: [Leaf]
    @Query private var sprouts: [Sprout]

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            if leaves.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(spacing: TrunkTheme.space2) {
                        ForEach(leaves) { leaf in
                            NavigationLink {
                                SagaDetailView(leaf: leaf, progression: progression)
                            } label: {
                                SagaRow(
                                    leaf: leaf,
                                    sproutCount: sproutsForLeaf(leaf).count,
                                    activeCount: sproutsForLeaf(leaf).filter { $0.state == .active }.count,
                                    contextLabel: contextLabel(for: leaf)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(TrunkTheme.space4)
                }
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("SAGAS")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: TrunkTheme.space4) {
            Text("No sagas yet")
                .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Text("Create a leaf when planting a sprout to start tracking related goals together.")
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
                .multilineTextAlignment(.center)
                .padding(.horizontal, TrunkTheme.space6)
        }
    }

    private func sproutsForLeaf(_ leaf: Leaf) -> [Sprout] {
        sprouts.filter { $0.leafId == leaf.id }
    }

    private func contextLabel(for leaf: Leaf) -> String {
        // Parse nodeId like "branch-0-twig-3" to get branch and twig names
        let parts = leaf.nodeId.split(separator: "-")
        guard parts.count >= 4,
              let branchIndex = Int(parts[1]),
              let twigIndex = Int(parts[3]) else {
            return leaf.nodeId
        }

        let branchNames = ["Core", "Brain", "Voice", "Hands", "Heart", "Breath", "Back", "Feet"]
        let branchName = branchIndex < branchNames.count ? branchNames[branchIndex] : "Branch"

        // Get default twig label
        let twigLabel = defaultTwigLabels[branchIndex]?[twigIndex] ?? "Twig"

        return "\(branchName) / \(twigLabel)"
    }

    private var defaultTwigLabels: [Int: [Int: String]] {
        [
            0: [0: "Movement", 1: "Strength", 2: "Sport", 3: "Technique", 4: "Maintenance", 5: "Nutrition", 6: "Sleep", 7: "Appearance"],
            1: [0: "Reading", 1: "Writing", 2: "Reasoning", 3: "Focus", 4: "Memory", 5: "Analysis", 6: "Dialogue", 7: "Exploration"],
            2: [0: "Practice", 1: "Composition", 2: "Interpretation", 3: "Performance", 4: "Consumption", 5: "Curation", 6: "Completion", 7: "Publication"],
            3: [0: "Design", 1: "Fabrication", 2: "Assembly", 3: "Repair", 4: "Refinement", 5: "Tooling", 6: "Tending", 7: "Preparation"],
            4: [0: "Homemaking", 1: "Care", 2: "Presence", 3: "Intimacy", 4: "Communication", 5: "Ritual", 6: "Adventure", 7: "Joy"],
            5: [0: "Observation", 1: "Nature", 2: "Flow", 3: "Repose", 4: "Idleness", 5: "Exposure", 6: "Abstinence", 7: "Reflection"],
            6: [0: "Connection", 1: "Support", 2: "Gathering", 3: "Membership", 4: "Stewardship", 5: "Advocacy", 6: "Service", 7: "Culture"],
            7: [0: "Work", 1: "Development", 2: "Positioning", 3: "Ventures", 4: "Finance", 5: "Operations", 6: "Planning", 7: "Administration"]
        ]
    }
}

// MARK: - Saga Row

struct SagaRow: View {
    let leaf: Leaf
    let sproutCount: Int
    let activeCount: Int
    let contextLabel: String

    var body: some View {
        HStack(spacing: TrunkTheme.space3) {
            // Left border
            Rectangle()
                .fill(activeCount > 0 ? Color.twig : Color.border)
                .frame(width: 2)

            VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                Text(leaf.name)
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .foregroundStyle(Color.ink)

                HStack(spacing: TrunkTheme.space2) {
                    Text(contextLabel)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)

                    Text("·")
                        .foregroundStyle(Color.inkFaint)

                    Text("\(sproutCount) sprout\(sproutCount == 1 ? "" : "s")")
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(activeCount > 0 ? Color.twig : Color.inkFaint)
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
        SagasView(progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
