//
//  EditSproutView.swift
//  Trunk
//
//  Edit mutable fields of an active sprout: title, bloom descriptions, leaf assignment.
//  Emits a sprout_edited event with sparse merge (only changed fields included).
//

import SwiftUI

struct EditSproutView: View {
    let sprout: DerivedSprout
    @Bindable var progression: ProgressionViewModel

    @Environment(\.dismiss) private var dismiss

    @State private var title: String
    @State private var bloomWither: String
    @State private var bloomBudding: String
    @State private var bloomFlourish: String
    @State private var selectedLeafId: String
    @State private var showNewLeafAlert = false
    @State private var newLeafName = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    // Derived state from EventStore
    private var state: DerivedState {
        EventStore.shared.getState()
    }

    /// Leaves belonging to this sprout's twig
    private var twigLeaves: [DerivedLeaf] {
        getLeavesForTwig(from: state, twigId: sprout.twigId)
    }

    private var isValid: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var hasChanges: Bool {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedWither = bloomWither.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedBudding = bloomBudding.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedFlourish = bloomFlourish.trimmingCharacters(in: .whitespacesAndNewlines)

        return trimmedTitle != sprout.title
            || trimmedWither != (sprout.bloomWither ?? "")
            || trimmedBudding != (sprout.bloomBudding ?? "")
            || trimmedFlourish != (sprout.bloomFlourish ?? "")
            || selectedLeafId != sprout.leafId
    }

    init(sprout: DerivedSprout, progression: ProgressionViewModel) {
        self.sprout = sprout
        self.progression = progression
        _title = State(initialValue: sprout.title)
        _bloomWither = State(initialValue: sprout.bloomWither ?? "")
        _bloomBudding = State(initialValue: sprout.bloomBudding ?? "")
        _bloomFlourish = State(initialValue: sprout.bloomFlourish ?? "")
        _selectedLeafId = State(initialValue: sprout.leafId)
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space5) {
                    // Read-only metadata
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        LabelWithHint(label: "COMMITMENT", hint: "(read-only)")

                        VStack(spacing: 0) {
                            readonlyRow(label: "Season", value: sprout.season.label)
                            Divider().overlay(Color.borderSubtle)
                            readonlyRow(label: "Environment", value: sprout.environment.label)
                            Divider().overlay(Color.borderSubtle)
                            readonlyRow(label: "Soil Cost", value: "\(Int(sprout.soilCost))")
                        }
                        .background(Color.paper)
                        .overlay(
                            Rectangle()
                                .stroke(Color.border, lineWidth: 1)
                        )
                    }

                    // Leaf (saga) picker
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        LabelWithHint(label: "LEAF", hint: "(saga)")

                        VStack(spacing: 1) {
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
                        LabelWithHint(label: "TITLE", hint: "(editable)")

                        TextField("Start with a verb...", text: $title)
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(Color.ink)
                            .padding(TrunkTheme.space3)
                            .background(Color.paper)
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

                    // Save button
                    Button("SAVE") {
                        saveSprout()
                    }
                    .buttonStyle(.trunk)
                    .disabled(!isValid || !hasChanges || isSaving)
                    .opacity(isValid && hasChanges && !isSaving ? 1 : 0.5)
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
                Text("EDIT SPROUT")
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

    private func readonlyRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Spacer()

            Text(value)
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.ink)
        }
        .padding(.vertical, TrunkTheme.space2)
        .padding(.horizontal, TrunkTheme.space3)
    }

    private func createNewLeaf() {
        let trimmedName = newLeafName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        let leafId = "leaf-\(UUID().uuidString.lowercased())"
        newLeafName = ""
        selectedLeafId = leafId

        Task {
            do {
                try await SyncService.shared.pushEvent(type: "leaf_created", payload: [
                    "leafId": .string(leafId),
                    "name": .string(trimmedName),
                    "twigId": .string(sprout.twigId)
                ])
            } catch {
                selectedLeafId = sprout.leafId
                errorMessage = "Failed to create leaf: \(error.localizedDescription)"
            }
        }
    }

    private func saveSprout() {
        isSaving = true
        errorMessage = nil

        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedWither = bloomWither.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedBudding = bloomBudding.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedFlourish = bloomFlourish.trimmingCharacters(in: .whitespacesAndNewlines)

        // Build sparse payload — only include fields that changed
        var payload: [String: JSONValue] = [
            "sproutId": .string(sprout.id)
        ]

        if trimmedTitle != sprout.title {
            payload["title"] = .string(trimmedTitle)
        }
        if trimmedWither != (sprout.bloomWither ?? "") {
            payload["bloomWither"] = .string(trimmedWither)
        }
        if trimmedBudding != (sprout.bloomBudding ?? "") {
            payload["bloomBudding"] = .string(trimmedBudding)
        }
        if trimmedFlourish != (sprout.bloomFlourish ?? "") {
            payload["bloomFlourish"] = .string(trimmedFlourish)
        }
        if selectedLeafId != sprout.leafId {
            payload["leafId"] = .string(selectedLeafId)
        }

        Task {
            do {
                try await SyncService.shared.pushEvent(type: "sprout_edited", payload: payload)
            } catch {
                print("Edit push failed, queued for retry: \(error)")
            }
        }

        // Dismiss immediately — optimistic update already in EventStore
        progression.refresh()
        HapticManager.success()
        dismiss()
    }
}

#Preview {
    let sprout = DerivedSprout(
        id: "preview-sprout",
        twigId: "branch-0-twig-0",
        title: "Learn SwiftUI",
        season: .threeMonths,
        environment: .firm,
        soilCost: 8,
        leafId: "leaf-preview",
        bloomWither: "Completed one tutorial",
        bloomBudding: "Built a small app",
        bloomFlourish: "Published an app to the App Store",
        state: .active,
        plantedAt: Date(),
        harvestedAt: nil,
        result: nil,
        reflection: nil,
        waterEntries: []
    )
    return NavigationStack {
        EditSproutView(sprout: sprout, progression: ProgressionViewModel())
    }
}
