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
    @State private var isWatering = false
    @FocusState private var isNoteFocused: Bool

    private var hasNote: Bool {
        !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

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
                Button {
                    waterSprout()
                } label: {
                    HStack(spacing: 4) {
                        Text("💧")
                        Text("Water")
                    }
                }
                .disabled(!progression.canWater || isWatering)
                .pulse(hasNote && progression.canWater && !isWatering)
            }
        }
        .onAppear {
            isNoteFocused = true
        }
    }

    private func waterSprout() {
        isWatering = true
        HapticManager.tap()

        // Create water entry
        let entry = WaterEntry(content: note.trimmingCharacters(in: .whitespacesAndNewlines))
        entry.sprout = sprout
        sprout.waterEntries.append(entry)
        modelContext.insert(entry)

        // Use water resource
        progression.useWater()

        // Push to cloud
        Task {
            try? await SyncService.shared.pushEvent(type: "sprout_watered", payload: [
                "sproutId": sprout.sproutId,
                "note": entry.content,
                "timestamp": ISO8601DateFormatter().string(from: entry.timestamp)
            ])
        }

        // Success feedback and dismiss with slight delay for visual feedback
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            HapticManager.success()
            dismiss()
        }
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

    return NavigationStack {
        WaterSproutView(sprout: sprout, progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
