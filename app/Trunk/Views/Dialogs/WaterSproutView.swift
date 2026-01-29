//
//  WaterSproutView.swift
//  Trunk
//
//  Dialog for watering a sprout with a journal entry.
//

import SwiftUI
import SwiftData

struct WaterSproutView: View {
    @Bindable var sprout: Sprout
    @Bindable var progression: ProgressionViewModel

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var note = ""
    @FocusState private var isNoteFocused: Bool

    var body: some View {
        Form {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text(sprout.title)
                        .font(.headline)

                    HStack(spacing: 8) {
                        Label("\(progression.waterAvailable)", systemImage: "drop.fill")
                            .foregroundStyle(.blue)
                        Text("water remaining today")
                            .foregroundStyle(.secondary)
                    }
                    .font(.subheadline)
                }
            }

            Section {
                TextField("What did you do today?", text: $note, axis: .vertical)
                    .lineLimit(3...6)
                    .focused($isNoteFocused)
            } header: {
                Text("Journal Entry (Optional)")
            } footer: {
                Text("Record your progress, thoughts, or reflections.")
            }

            Section {
                HStack {
                    Text("Soil Recovery")
                    Spacer()
                    Text("+\(String(format: "%.2f", ProgressionService.waterRecovery))")
                        .foregroundStyle(.green)
                }
            } footer: {
                Text("Watering helps you recover a tiny bit of soil capacity.")
            }
        }
        .navigationTitle("Water Sprout")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Button("Water") {
                    waterSprout()
                }
                .disabled(!progression.canWater)
            }
        }
        .onAppear {
            isNoteFocused = true
        }
    }

    private func waterSprout() {
        // Create water entry
        let entry = WaterEntry(note: note.trimmingCharacters(in: .whitespacesAndNewlines))
        entry.sprout = sprout
        sprout.waterEntries.append(entry)
        modelContext.insert(entry)

        // Use water resource
        progression.useWater()

        dismiss()
    }
}

#Preview {
    let sprout = Sprout(
        title: "Learn SwiftUI",
        season: .threeMonths,
        environment: .firm,
        nodeId: "branch-0-twig-0",
        soilCost: 8
    )
    sprout.plant()

    return NavigationStack {
        WaterSproutView(sprout: sprout, progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
