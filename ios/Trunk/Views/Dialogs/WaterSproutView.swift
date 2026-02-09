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
    @State private var errorMessage: String?
    @FocusState private var isNoteFocused: Bool

    private var hasNote: Bool {
        !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space5) {
                    // Sprout info
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        Text(sprout.title)
                            .trunkFont(size: TrunkTheme.textLg, weight: .semibold)
                            .foregroundStyle(Color.ink)

                        HStack(spacing: TrunkTheme.space2) {
                            Text("💧")
                            Text("\(progression.waterAvailable) water remaining today")
                                .trunkFont(size: TrunkTheme.textSm)
                                .foregroundStyle(Color.trunkWater)
                        }
                    }

                    // Journal entry
                    VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                        Text("JOURNAL ENTRY")
                            .monoLabel(size: TrunkTheme.textXs)

                        TextField("What did you do today?", text: $note, axis: .vertical)
                            .trunkFont(size: TrunkTheme.textBase)
                            .foregroundStyle(Color.ink)
                            .lineLimit(3...6)
                            .padding(TrunkTheme.space3)
                            .background(Color.paper)
                            .overlay(
                                Rectangle()
                                    .stroke(Color.border, lineWidth: 1)
                            )
                            .focused($isNoteFocused)

                        Text("Record your progress, thoughts, or reflections.")
                            .trunkFont(size: TrunkTheme.textXs)
                            .foregroundStyle(Color.inkFaint)
                    }

                    // Soil recovery
                    HStack {
                        Text("SOIL RECOVERY")
                            .monoLabel(size: TrunkTheme.textXs)

                        Spacer()

                        Text("+\(String(format: "%.2f", ProgressionService.waterRecovery))")
                            .trunkFont(size: TrunkTheme.textBase)
                            .foregroundStyle(Color.twig)
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

                    // Water button
                    Button {
                        waterSprout()
                    } label: {
                        HStack(spacing: TrunkTheme.space1) {
                            Text("💧")
                            Text("WATER")
                        }
                    }
                    .buttonStyle(.trunkWater)
                    .disabled(!progression.canWater || isWatering)
                    .opacity(!progression.canWater || isWatering ? 0.5 : 1)
                    .pulse(hasNote && progression.canWater && !isWatering)
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
                .trunkFont(size: TrunkTheme.textSm)
                .foregroundStyle(Color.inkFaint)
            }
            ToolbarItem(placement: .principal) {
                Text("WATER SPROUT")
                    .trunkFont(size: TrunkTheme.textBase)
                    .tracking(2)
                    .foregroundStyle(Color.trunkWater)
            }
        }
        .onAppear {
            isNoteFocused = true
        }
    }

    private func waterSprout() {
        isWatering = true
        errorMessage = nil
        HapticManager.tap()

        let content = note.trimmingCharacters(in: .whitespacesAndNewlines)
        let timestamp = ISO8601DateFormatter().string(from: Date())

        Task {
            do {
                try await SyncService.shared.pushEvent(type: "sprout_watered", payload: [
                    "sproutId": sprout.id,
                    "content": content,
                    "timestamp": timestamp
                ])
                HapticManager.success()
                dismiss()
            } catch {
                isWatering = false
                errorMessage = "Failed to save. Check your connection and try again."
                HapticManager.tap()
            }
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
