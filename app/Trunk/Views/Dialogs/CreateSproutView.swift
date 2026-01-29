//
//  CreateSproutView.swift
//  Trunk
//
//  Form for creating a new sprout.
//

import SwiftUI
import SwiftData

struct CreateSproutView: View {
    let nodeId: String
    @Bindable var progression: ProgressionViewModel

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query private var allLeaves: [Leaf]

    @State private var title = ""
    @State private var season: Season = .oneMonth
    @State private var environment: SproutEnvironment = .firm
    @State private var bloomLow = ""
    @State private var bloomMid = ""
    @State private var bloomHigh = ""
    @State private var selectedLeafId: String?
    @State private var showNewLeafAlert = false
    @State private var newLeafName = ""

    /// Leaves belonging to this twig
    private var twigLeaves: [Leaf] {
        allLeaves.filter { $0.nodeId == nodeId }
    }

    private var soilCost: Int {
        ProgressionService.soilCost(season: season, environment: environment)
    }

    private var canAfford: Bool {
        progression.canAfford(cost: soilCost)
    }

    private var isValid: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space5) {
                    // Title
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        Text("WHAT DO YOU WANT TO GROW?")
                            .monoLabel(size: TrunkTheme.textXs)

                        TextField("Enter title...", text: $title)
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
                        Text("SEASON")
                            .monoLabel(size: TrunkTheme.textXs)

                        VStack(spacing: 1) {
                            ForEach(Season.allCases, id: \.self) { s in
                                Button {
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
                        Text("ENVIRONMENT")
                            .monoLabel(size: TrunkTheme.textXs)

                        VStack(spacing: 1) {
                            ForEach(SproutEnvironment.allCases, id: \.self) { e in
                                Button {
                                    environment = e
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(e.label)
                                                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                                .foregroundStyle(environment == e ? Color.ink : Color.inkFaint)

                                            Text(e.sproutDescription)
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

                    // Leaf (saga) picker
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        Text("LEAF (SAGA)")
                            .monoLabel(size: TrunkTheme.textXs)

                        VStack(spacing: 1) {
                            // None option
                            Button {
                                selectedLeafId = nil
                            } label: {
                                HStack {
                                    Text("None")
                                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                        .foregroundStyle(selectedLeafId == nil ? Color.ink : Color.inkFaint)

                                    Spacer()

                                    Text(selectedLeafId == nil ? "●" : "○")
                                        .font(.system(size: 10, design: .monospaced))
                                        .foregroundStyle(selectedLeafId == nil ? Color.wood : Color.inkFaint)
                                }
                                .padding(.vertical, TrunkTheme.space2)
                                .padding(.horizontal, TrunkTheme.space3)
                                .background(Color.paper)
                            }
                            .buttonStyle(.plain)

                            // Existing leaves
                            ForEach(twigLeaves) { leaf in
                                Button {
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
                                    .background(Color.paper)
                                }
                                .buttonStyle(.plain)
                            }

                            // New leaf option
                            Button {
                                showNewLeafAlert = true
                            } label: {
                                HStack {
                                    Text("+ New leaf...")
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

                    // Bloom descriptions
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        Text("BLOOM DESCRIPTIONS")
                            .monoLabel(size: TrunkTheme.textXs)

                        VStack(spacing: TrunkTheme.space2) {
                            BloomField(label: "1/5", placeholder: "Minimal outcome...", text: $bloomLow)
                            BloomField(label: "3/5", placeholder: "Good outcome...", text: $bloomMid)
                            BloomField(label: "5/5", placeholder: "Exceptional outcome...", text: $bloomHigh)
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
                                .foregroundStyle(canAfford ? Color.twig : Color(red: 0.6, green: 0.35, blue: 0.3))
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

                    // Actions
                    HStack(spacing: TrunkTheme.space3) {
                        Button("SAVE DRAFT") {
                            saveDraft()
                        }
                        .buttonStyle(.trunkSecondary)
                        .disabled(!isValid)
                        .opacity(isValid ? 1 : 0.5)

                        Button("PLANT NOW") {
                            plantNow()
                        }
                        .buttonStyle(.trunk)
                        .disabled(!isValid || !canAfford)
                        .opacity(isValid && canAfford ? 1 : 0.5)
                    }
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

        let leaf = Leaf(name: trimmedName, nodeId: nodeId)
        modelContext.insert(leaf)
        selectedLeafId = leaf.id
        newLeafName = ""
    }

    private func saveDraft() {
        let sprout = Sprout(
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            season: season,
            environment: environment,
            nodeId: nodeId,
            soilCost: soilCost,
            bloomLow: bloomLow,
            bloomMid: bloomMid,
            bloomHigh: bloomHigh
        )
        sprout.leafId = selectedLeafId
        modelContext.insert(sprout)
        dismiss()
    }

    private func plantNow() {
        let sprout = Sprout(
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            season: season,
            environment: environment,
            nodeId: nodeId,
            soilCost: soilCost,
            bloomLow: bloomLow,
            bloomMid: bloomMid,
            bloomHigh: bloomHigh
        )
        sprout.leafId = selectedLeafId
        modelContext.insert(sprout)
        progression.plantSprout(sprout)
        dismiss()
    }
}

struct BloomField: View {
    let label: String
    let placeholder: String
    @Binding var text: String

    var body: some View {
        HStack(alignment: .top, spacing: TrunkTheme.space2) {
            Text(label)
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
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
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
