//
//  WaterDailySproutsView.swift
//  Trunk
//
//  Full-sheet view for watering up to 3 sprouts at once with journal entries.
//

import SwiftUI

struct WaterDailySproutsView: View {
    let sprouts: [DerivedSprout]
    @Bindable var progression: ProgressionViewModel
    let wateredTodayIds: Set<String>

    @Environment(\.dismiss) private var dismiss

    @State private var notes: [String: String] = [:]
    @State private var wateredIds: Set<String> = []
    @State private var prompts: [String: String] = [:]

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space5) {
                    ForEach(sprouts, id: \.id) { sprout in
                        sproutSection(sprout: sprout)
                    }
                }
                .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") {
                    dismiss()
                }
                .trunkFont(size: TrunkTheme.textSm)
                .foregroundStyle(Color.inkFaint)
            }
            ToolbarItem(placement: .principal) {
                Text("WATER YOUR SPROUTS")
                    .trunkFont(size: TrunkTheme.textBase)
                    .tracking(2)
                    .foregroundStyle(Color.trunkWater)
            }
        }
        .onAppear {
            assignPrompts()
        }
    }

    // MARK: - Sprout Section

    private func sproutSection(sprout: DerivedSprout) -> some View {
        let isWatered = wateredIds.contains(sprout.id) || wateredTodayIds.contains(sprout.id)
        let prompt = prompts[sprout.id] ?? ""
        let note = binding(for: sprout.id)

        return VStack(alignment: .leading, spacing: TrunkTheme.space3) {
            // Sprout title
            Text(sprout.title)
                .trunkFont(size: TrunkTheme.textBase, weight: .semibold)
                .foregroundStyle(Color.ink)

            // Prompt
            if !prompt.isEmpty {
                Text("\"\(prompt)\"")
                    .trunkFont(size: TrunkTheme.textSm)
                    .italic()
                    .foregroundStyle(Color.inkLight)
                    .padding(TrunkTheme.space3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.paper)
                    .overlay(
                        Rectangle()
                            .stroke(Color.border, lineWidth: 1)
                    )
            }

            // Journal entry
            TextField("Optional journal entry...", text: note, axis: .vertical)
                .trunkFont(size: TrunkTheme.textBase)
                .foregroundStyle(Color.ink)
                .lineLimit(2...4)
                .padding(TrunkTheme.space3)
                .background(Color.paper)
                .overlay(
                    Rectangle()
                        .stroke(Color.border, lineWidth: 1)
                )
                .disabled(isWatered)

            // Water button
            Button {
                waterSprout(sprout)
            } label: {
                HStack(spacing: TrunkTheme.space1) {
                    Text(isWatered ? "\u{2713}" : "\u{1F4A7}")
                    Text("WATER")
                }
            }
            .buttonStyle(.trunkWater)
            .disabled(isWatered || !progression.canWater)
            .opacity(isWatered || !progression.canWater ? 0.5 : 1)
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(isWatered ? Color.border : Color.trunkWater, lineWidth: 1)
        )
        .opacity(isWatered ? 0.4 : 1)
    }

    // MARK: - Prompt Assignment

    /// Assign a unique random prompt to each sprout (no duplicates within the 3).
    private func assignPrompts() {
        var available = SharedConstants.WateringPrompts.prompts.shuffled()
        var assigned: [String: String] = [:]
        for sprout in sprouts {
            if let prompt = available.first {
                assigned[sprout.id] = prompt
                available.removeFirst()
            }
        }
        prompts = assigned
    }

    // MARK: - Note Binding

    private func binding(for sproutId: String) -> Binding<String> {
        Binding(
            get: { notes[sproutId] ?? "" },
            set: { notes[sproutId] = $0 }
        )
    }

    // MARK: - Water Action

    private func waterSprout(_ sprout: DerivedSprout) {
        HapticManager.tap()

        let content = (notes[sprout.id] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let timestamp = ISO8601DateFormatter().string(from: Date())

        Task {
            do {
                try await SyncService.shared.pushEvent(type: "sprout_watered", payload: [
                    "sproutId": sprout.id,
                    "content": content,
                    "timestamp": timestamp
                ])
            } catch {
                print("Water push failed (rolled back): \(error)")
            }
        }

        wateredIds.insert(sprout.id)
        progression.refresh()
        HapticManager.success()
    }
}

#Preview {
    let sprout = DerivedSprout(
        id: "preview-sprout-1",
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
        WaterDailySproutsView(
            sprouts: [sprout],
            progression: ProgressionViewModel(),
            wateredTodayIds: []
        )
    }
}
