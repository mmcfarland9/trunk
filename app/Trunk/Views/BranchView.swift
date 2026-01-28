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
        "Health", "Career", "Relations", "Finance",
        "Growth", "Creative", "Home", "Adventure"
    ]

    private let twigCount = TrunkConstants.Tree.twigCount

    var body: some View {
        List {
            Section {
                ForEach(0..<twigCount, id: \.self) { twigIndex in
                    let twigId = "branch-\(branchIndex)-twig-\(twigIndex)"
                    let twigSprouts = sproutsForTwig(twigId)

                    Button {
                        selectedTwig = TwigSelection(id: twigIndex)
                    } label: {
                        TwigRow(
                            twigIndex: twigIndex,
                            label: labelForTwig(twigId),
                            activeSproutCount: twigSprouts.filter { $0.state == .active }.count,
                            draftSproutCount: twigSprouts.filter { $0.state == .draft }.count
                        )
                    }
                    .buttonStyle(.plain)
                }
            } header: {
                Text("Twigs")
            } footer: {
                Text("Tap a twig to view and manage its sprouts.")
            }
        }
        .navigationTitle(branchNames[branchIndex])
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

    private func labelForTwig(_ twigId: String) -> String {
        if let data = nodeData.first(where: { $0.nodeId == twigId }), !data.label.isEmpty {
            return data.label
        }
        // Default labels based on branch
        let twigIndex = Int(String(twigId.last ?? "0")) ?? 0
        return defaultTwigLabels[branchIndex]?[twigIndex] ?? "Twig"
    }

    private var defaultTwigLabels: [Int: [Int: String]] {
        // Simplified default labels - in production these would come from preset JSON
        [
            0: [0: "Movement", 1: "Nutrition", 2: "Sleep", 3: "Mental", 4: "Medical", 5: "Recovery", 6: "Energy", 7: "Habits"],
            1: [0: "Skills", 1: "Projects", 2: "Network", 3: "Income", 4: "Learning", 5: "Leadership", 6: "Brand", 7: "Goals"],
            2: [0: "Family", 1: "Friends", 2: "Partner", 3: "Community", 4: "Mentors", 5: "Social", 6: "Boundaries", 7: "Support"],
            3: [0: "Budget", 1: "Savings", 2: "Investing", 3: "Debt", 4: "Income", 5: "Protection", 6: "Planning", 7: "Giving"],
            4: [0: "Reading", 1: "Courses", 2: "Practice", 3: "Reflection", 4: "Teaching", 5: "Writing", 6: "Research", 7: "Wisdom"],
            5: [0: "Art", 1: "Music", 2: "Writing", 3: "Crafts", 4: "Design", 5: "Play", 6: "Expression", 7: "Innovation"],
            6: [0: "Space", 1: "Systems", 2: "Comfort", 3: "Garden", 4: "Tech", 5: "Meals", 6: "Guests", 7: "Peace"],
            7: [0: "Travel", 1: "Nature", 2: "Challenge", 3: "Discovery", 4: "Culture", 5: "Spontaneity", 6: "Stories", 7: "Dreams"]
        ]
    }
}

// MARK: - Twig Row

struct TwigRow: View {
    let twigIndex: Int
    let label: String
    let activeSproutCount: Int
    let draftSproutCount: Int

    var body: some View {
        HStack {
            // Twig number
            Text("\(twigIndex + 1)")
                .font(.headline)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(Color.green)
                .clipShape(Circle())

            // Label
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.body)

                if activeSproutCount > 0 || draftSproutCount > 0 {
                    HStack(spacing: 8) {
                        if activeSproutCount > 0 {
                            Label("\(activeSproutCount) active", systemImage: "leaf.fill")
                                .font(.caption)
                                .foregroundStyle(.green)
                        }
                        if draftSproutCount > 0 {
                            Label("\(draftSproutCount) draft", systemImage: "pencil")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    NavigationStack {
        BranchView(branchIndex: 0, progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self], inMemory: true)
}
