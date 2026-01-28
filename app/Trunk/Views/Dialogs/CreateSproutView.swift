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

    @State private var title = ""
    @State private var season: Season = .oneMonth
    @State private var environment: SproutEnvironment = .firm
    @State private var bloomLow = ""
    @State private var bloomMid = ""
    @State private var bloomHigh = ""

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
        Form {
            // Title
            Section("What do you want to grow?") {
                TextField("Title", text: $title)
            }

            // Season
            Section {
                Picker("Duration", selection: $season) {
                    ForEach(Season.allCases, id: \.self) { s in
                        Text(s.label).tag(s)
                    }
                }
            } header: {
                Text("Season")
            } footer: {
                Text("How long will you work on this goal?")
            }

            // Environment
            Section {
                Picker("Difficulty", selection: $environment) {
                    ForEach(SproutEnvironment.allCases, id: \.self) { e in
                        VStack(alignment: .leading) {
                            Text(e.label)
                            Text(e.sproutDescription)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .tag(e)
                    }
                }
                .pickerStyle(.inline)
                .labelsHidden()
            } header: {
                Text("Environment")
            } footer: {
                Text("Harder environments cost more soil but give greater rewards.")
            }

            // Bloom descriptions
            Section {
                TextField("1/5 - Minimal outcome", text: $bloomLow, axis: .vertical)
                    .lineLimit(2...4)
                TextField("3/5 - Good outcome", text: $bloomMid, axis: .vertical)
                    .lineLimit(2...4)
                TextField("5/5 - Exceptional outcome", text: $bloomHigh, axis: .vertical)
                    .lineLimit(2...4)
            } header: {
                Text("Bloom Descriptions")
            } footer: {
                Text("Define what success looks like at different levels.")
            }

            // Cost summary
            Section {
                HStack {
                    Text("Soil Cost")
                    Spacer()
                    Text("\(soilCost)")
                        .fontWeight(.bold)
                        .foregroundStyle(canAfford ? .brown : .red)
                }

                HStack {
                    Text("Your Soil")
                    Spacer()
                    Text("\(progression.soilAvailableInt) / \(progression.soilCapacityInt)")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("New Sprout")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button("Save as Draft") {
                        saveDraft()
                    }

                    Button("Plant Now") {
                        plantNow()
                    }
                    .disabled(!canAfford)
                } label: {
                    Text("Save")
                }
                .disabled(!isValid)
            }
        }
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
        modelContext.insert(sprout)
        progression.plantSprout(sprout)
        dismiss()
    }
}

#Preview {
    NavigationStack {
        CreateSproutView(nodeId: "branch-0-twig-0", progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self], inMemory: true)
}
