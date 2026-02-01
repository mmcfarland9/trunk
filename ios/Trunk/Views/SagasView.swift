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

        let branchName = SharedConstants.Tree.branchName(branchIndex)
        let twigLabel = SharedConstants.Tree.twigLabel(branchIndex: branchIndex, twigIndex: twigIndex)

        return "\(branchName) / \(twigLabel.capitalized)"
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
