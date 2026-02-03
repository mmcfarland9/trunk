//
//  WaterSproutView.swift
//  Trunk
//
//  Dialog for watering a sprout with a journal entry.
//

import SwiftUI

struct WaterSproutView: View {
    let sprout: DerivedSprout
    @Bindable var progression: ProgressionViewModel

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

        let content = note.trimmingCharacters(in: .whitespacesAndNewlines)
        let timestamp = ISO8601DateFormatter().string(from: Date())

        // Push to cloud - state will derive automatically from events
        Task {
            try? await SyncService.shared.pushEvent(type: "sprout_watered", payload: [
                "sproutId": sprout.id,
                "note": content,
                "timestamp": timestamp
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
    let sprout = DerivedSprout(
        id: "preview-sprout",
        twigId: "branch-0-twig-0",
        title: "Learn SwiftUI",
        season: .threeMonths,
        environment: .firm,
        soilCost: 8,
        leafId: nil,
        bloomWither: nil,
        bloomBudding: nil,
        bloomFlourish: nil,
        state: .active,
        plantedAt: Date(),
        harvestedAt: nil,
        result: nil,
        reflection: nil,
        waterEntries: []
    )

    return NavigationStack {
        WaterSproutView(sprout: sprout, progression: ProgressionViewModel())
    }
}
