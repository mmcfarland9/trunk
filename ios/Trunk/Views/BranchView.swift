//
//  BranchView.swift
//  Trunk
//
//  Shows a single branch with its 8 twigs.
//

import SwiftUI

// Wrapper for sheet presentation with twig index
struct TwigSelection: Identifiable {
    let id: Int
    var index: Int { id }
}

struct BranchView: View {
    let branchIndex: Int
    @Bindable var progression: ProgressionViewModel

    @State private var selectedTwig: TwigSelection?

    private let twigCount = SharedConstants.Tree.twigCount

    // Derived state from EventStore
    private var state: DerivedState {
        EventStore.shared.getState()
    }

    private var sprouts: [DerivedSprout] {
        Array(state.sprouts.values)
    }

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
                Text(SharedConstants.Tree.branchName(branchIndex))
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

    private func sproutsForTwig(_ twigId: String) -> [DerivedSprout] {
        getSproutsForTwig(from: state, twigId: twigId)
    }

    private func labelForTwig(_ twigId: String, twigIndex: Int) -> String {
        SharedConstants.Tree.twigLabel(branchIndex: branchIndex, twigIndex: twigIndex)
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
}
