//
//  CreateSproutView.swift
//  Trunk
//
//  Form for creating a new sprout.
//

import SwiftUI

struct CreateSproutView: View {
    let nodeId: String
    @Bindable var progression: ProgressionViewModel

    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var season: Season = .oneMonth
    @State private var environment: SproutEnvironment = .firm
    @State private var bloomWither = ""
    @State private var bloomBudding = ""
    @State private var bloomFlourish = ""
    @State private var selectedLeafId: String?
    @State private var showNewLeafAlert = false
    @State private var newLeafName = ""
    @State private var isPlanting = false
    @State private var errorMessage: String?

    // Derived state from EventStore
    private var state: DerivedState {
        EventStore.shared.getState()
    }

    /// Leaves belonging to this twig
    private var twigLeaves: [DerivedLeaf] {
        getLeavesForTwig(from: state, twigId: nodeId)
    }

    private var soilCost: Int {
        ProgressionService.soilCost(season: season, environment: environment)
    }

    private var canAfford: Bool {
        progression.canAfford(cost: soilCost)
    }

    private var isValid: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && selectedLeafId != nil
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space5) {
                    // Leaf (saga) picker - required, comes first
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        LabelWithHint(label: "LEAF", hint: "(saga)")

                        VStack(spacing: 1) {
                            // Existing leaves
                            ForEach(twigLeaves) { leaf in
                                Button {
                                    HapticManager.selection()
                                    selectedLeafId = leaf.id
                                } label: {
                                    HStack {
                                        Text(leaf.name)
                                            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                            .foregroundStyle(selectedLeafId == leaf.id ? Color.ink : Color.inkFaint)

                                        Spacer()

                                        Text(selectedLeafId == leaf.id ? "●" : "○")
                                            .font(.system(size: 10, design: .monospaced))
                                            .foregroundStyle(selectedLeafId == leaf.id ? Color.wood : Color.inkFaint)
                                    }
                                    .padding(.vertical, TrunkTheme.space2)
                                    .padding(.horizontal, TrunkTheme.space3)
                                    .frame(minHeight: 44)
                                    .background(Color.paper)
                                }
                                .buttonStyle(.plain)
                            }

                            // New leaf option
                            Button {
                                showNewLeafAlert = true
                            } label: {
                                HStack {
                                    Text("+ Create new leaf")
                                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                        .foregroundStyle(Color.twig)

                                    Spacer()
                                }
                                .padding(.vertical, TrunkTheme.space2)
                                .padding(.horizontal, TrunkTheme.space3)
                                .background(Color.paper)
                            }
                            .buttonStyle(.plain)
                        }
                        .overlay(
                            Rectangle()
                                .stroke(Color.border, lineWidth: 1)
                        )
                    }

                    // Sprout title
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        LabelWithHint(label: "SPROUT", hint: "(task)")

                        TextField("Describe this sprout.", text: $title)
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(Color.ink)
                            .padding(TrunkTheme.space3)
                            .background(Color.paper)
                            .overlay(
                                Rectangle()
                                    .stroke(Color.border, lineWidth: 1)
                            )
                    }

                    // Season
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        LabelWithHint(label: "SEASON", hint: "(period)")

                        VStack(spacing: 1) {
                            ForEach(Season.allCases, id: \.self) { s in
                                Button {
                                    HapticManager.selection()
                                    season = s
                                } label: {
                                    HStack {
                                        Text(s.label)
                                            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                            .foregroundStyle(season == s ? Color.ink : Color.inkFaint)

                                        Spacer()

                                        if season == s {
                                            Text("●")
                                                .font(.system(size: 10, design: .monospaced))
                                                .foregroundStyle(Color.wood)
                                        } else {
                                            Text("○")
                                                .font(.system(size: 10, design: .monospaced))
                                                .foregroundStyle(Color.inkFaint)
                                        }
                                    }
                                    .padding(.vertical, TrunkTheme.space2)
                                    .padding(.horizontal, TrunkTheme.space3)
                                    .frame(minHeight: 44)
                                    .background(Color.paper)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .overlay(
                            Rectangle()
                                .stroke(Color.border, lineWidth: 1)
                        )
                    }

                    // Environment
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        LabelWithHint(label: "ENVIRONMENT", hint: "(difficulty)")

                        VStack(spacing: 1) {
                            ForEach(SproutEnvironment.allCases, id: \.self) { e in
                                Button {
                                    HapticManager.selection()
                                    environment = e
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(e.label)
                                                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                                .foregroundStyle(environment == e ? Color.ink : Color.inkFaint)

                                            Text(e.formHint)
                                                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                                .foregroundStyle(Color.inkFaint)
                                        }

                                        Spacer()

                                        if environment == e {
                                            Text("●")
                                                .font(.system(size: 10, design: .monospaced))
                                                .foregroundStyle(Color.wood)
                                        } else {
                                            Text("○")
                                                .font(.system(size: 10, design: .monospaced))
                                                .foregroundStyle(Color.inkFaint)
                                        }
                                    }
                                    .padding(.vertical, TrunkTheme.space2)
                                    .padding(.horizontal, TrunkTheme.space3)
                                    .frame(minHeight: 44)
                                    .background(Color.paper)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .overlay(
                            Rectangle()
                                .stroke(Color.border, lineWidth: 1)
                        )
                    }

                    // Bloom descriptions
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        LabelWithHint(label: "BLOOM", hint: "(outcomes)")

                        VStack(spacing: TrunkTheme.space2) {
                            BloomField(emoji: "🥀", placeholder: "What does withering look like?", text: $bloomWither)
                            BloomField(emoji: "🌱", placeholder: "What does budding look like?", text: $bloomBudding)
                            BloomField(emoji: "🌲", placeholder: "What does flourishing look like?", text: $bloomFlourish)
                        }
                    }

                    // Cost summary
                    VStack(spacing: TrunkTheme.space2) {
                        HStack {
                            Text("SOIL COST")
                                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)

                            Spacer()

                            Text("\(soilCost)")
                                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                                .fontWeight(.medium)
                                .foregroundStyle(canAfford ? Color.twig : Color.trunkWarning)
                        }

                        HStack {
                            Text("YOUR SOIL")
                                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)

                            Spacer()

                            Text("\(progression.soilAvailableInt) / \(progression.soilCapacityInt)")
                                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)
                        }
                    }
                    .padding(TrunkTheme.space3)
                    .background(Color.paper)
                    .overlay(
                        Rectangle()
                            .stroke(Color.border, lineWidth: 1)
                    )

                    // Error message
                    if let error = errorMessage {
                        Text(error)
                            .trunkFont(size: TrunkTheme.textXs)
                            .foregroundStyle(Color.trunkDestructive)
                            .padding(TrunkTheme.space3)
                            .background(Color.trunkDestructive.opacity(0.08))
                            .overlay(
                                Rectangle()
                                    .stroke(Color.trunkDestructive.opacity(0.3), lineWidth: 1)
                            )
                    }

                    // Actions
                    Button("PLANT") {
                        plantSprout()
                    }
                    .buttonStyle(.trunk)
                    .disabled(!isValid || !canAfford || isPlanting)
                    .opacity(isValid && canAfford && !isPlanting ? 1 : 0.5)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }
                .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
            }
            ToolbarItem(placement: .principal) {
                Text("NEW SPROUT")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
            }
        }
        .alert("New Leaf", isPresented: $showNewLeafAlert) {
            TextField("Leaf name", text: $newLeafName)
            Button("Cancel", role: .cancel) {
                newLeafName = ""
            }
            Button("Create") {
                createNewLeaf()
            }
        } message: {
            Text("Enter a name for this saga")
        }
    }

    private func createNewLeaf() {
        let trimmedName = newLeafName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        let leafId = UUID().uuidString
        selectedLeafId = leafId
        newLeafName = ""

        // Push to cloud - state will derive automatically from events
        Task {
            try? await SyncService.shared.pushEvent(type: "leaf_created", payload: [
                "leafId": leafId,
                "name": trimmedName,
                "twigId": nodeId
            ])
        }
    }

    private func plantSprout() {
        isPlanting = true
        errorMessage = nil

        let sproutId = UUID().uuidString
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)

        Task {
            do {
                try await SyncService.shared.pushEvent(type: "sprout_planted", payload: [
                    "sproutId": sproutId,
                    "title": trimmedTitle,
                    "twigId": nodeId,
                    "season": season.rawValue,
                    "environment": environment.rawValue,
                    "soilCost": soilCost,
                    "leafId": selectedLeafId as Any,
                    "bloomWither": bloomWither,
                    "bloomBudding": bloomBudding,
                    "bloomFlourish": bloomFlourish
                ])
                HapticManager.success()
                dismiss()
            } catch {
                isPlanting = false
                errorMessage = "Failed to save. Check your connection and try again."
                HapticManager.error()
            }
        }
    }
}

struct LabelWithHint: View {
    let label: String
    let hint: String

    var body: some View {
        HStack(spacing: TrunkTheme.space1) {
            Text(label)
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .textCase(.uppercase)
                .tracking(TrunkTheme.trackingUppercase)
                .foregroundStyle(Color.inkFaint)

            Text(hint)
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint.opacity(0.7))
        }
    }
}

struct BloomField: View {
    let emoji: String
    let placeholder: String
    @Binding var text: String

    var body: some View {
        HStack(alignment: .top, spacing: TrunkTheme.space2) {
            Text(emoji)
                .font(.system(size: TrunkTheme.textBase))
                .frame(width: 24)

            TextField(placeholder, text: $text, axis: .vertical)
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.ink)
                .lineLimit(2...4)
        }
        .padding(TrunkTheme.space2)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }
}

#Preview {
    NavigationStack {
        CreateSproutView(nodeId: "branch-0-twig-0", progression: ProgressionViewModel())
    }
}
