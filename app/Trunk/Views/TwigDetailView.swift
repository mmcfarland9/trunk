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

    @State private var showingCreateSprout = false
    @State private var selectedSprout: Sprout?

    private var nodeId: String {
        "branch-\(branchIndex)-twig-\(twigIndex)"
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
        List {
            // Drafts section
            if !draftSprouts.isEmpty {
                Section("Drafts") {
                    ForEach(draftSprouts, id: \.id) { sprout in
                        SproutRow(sprout: sprout) {
                            selectedSprout = sprout
                        }
                    }
                    .onDelete { indexSet in
                        deleteSprouts(at: indexSet, from: draftSprouts)
                    }
                }
            }

            // Growing section
            if !activeSprouts.isEmpty {
                Section("Growing") {
                    ForEach(activeSprouts, id: \.id) { sprout in
                        SproutRow(sprout: sprout) {
                            selectedSprout = sprout
                        }
                    }
                }
            }

            // Harvested section
            if !completedSprouts.isEmpty {
                Section("Harvested") {
                    ForEach(completedSprouts, id: \.id) { sprout in
                        SproutRow(sprout: sprout) {
                            selectedSprout = sprout
                        }
                    }
                    .onDelete { indexSet in
                        deleteSprouts(at: indexSet, from: completedSprouts)
                    }
                }
            }

            // Empty state
            if sprouts.isEmpty {
                Section {
                    ContentUnavailableView(
                        "No Sprouts",
                        systemImage: "leaf",
                        description: Text("Tap + to create your first sprout for this twig.")
                    )
                }
            }
        }
        .navigationTitle("Twig \(twigIndex + 1)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") {
                    dismiss()
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showingCreateSprout = true
                } label: {
                    Image(systemName: "plus")
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

    private func deleteSprouts(at indexSet: IndexSet, from list: [Sprout]) {
        for index in indexSet {
            let sprout = list[index]
            // Return soil if draft
            if sprout.state == .draft {
                progression.returnSoil(sprout.soilCost)
            }
            modelContext.delete(sprout)
        }
    }
}


// MARK: - Sprout Row

struct SproutRow: View {
    let sprout: Sprout
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                // State indicator
                stateIcon
                    .frame(width: 24)

                // Title and details
                VStack(alignment: .leading, spacing: 2) {
                    Text(sprout.title)
                        .font(.body)
                        .foregroundStyle(.primary)

                    HStack(spacing: 8) {
                        Text(sprout.season.label)
                        Text("•")
                        Text(sprout.environment.label)
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                // Progress or result
                trailingContent
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var stateIcon: some View {
        switch sprout.state {
        case .draft:
            Image(systemName: "pencil.circle")
                .foregroundStyle(.secondary)
        case .active:
            Image(systemName: "leaf.fill")
                .foregroundStyle(.green)
        case .completed:
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
        case .failed:
            Image(systemName: "xmark.circle.fill")
                .foregroundStyle(.red)
        }
    }

    @ViewBuilder
    private var trailingContent: some View {
        switch sprout.state {
        case .draft:
            Text("\(sprout.soilCost) soil")
                .font(.caption)
                .foregroundStyle(.brown)
        case .active:
            if sprout.isReady {
                Label("Ready", systemImage: "sparkles")
                    .font(.caption)
                    .foregroundStyle(.orange)
            } else if let plantedAt = sprout.plantedAt {
                let progress = ProgressionService.progress(plantedAt: plantedAt, season: sprout.season)
                CircularProgressView(progress: progress)
                    .frame(width: 30, height: 30)
            }
        case .completed:
            if let result = sprout.result {
                HStack(spacing: 2) {
                    ForEach(0..<5, id: \.self) { i in
                        Image(systemName: i < result ? "star.fill" : "star")
                            .font(.caption2)
                            .foregroundStyle(i < result ? .yellow : .secondary)
                    }
                }
            }
        case .failed:
            Text("Failed")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

#Preview {
    NavigationStack {
        TwigDetailView(branchIndex: 0, twigIndex: 0, progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self], inMemory: true)
}
