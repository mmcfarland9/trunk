//
//  UpcomingHarvestsView.swift
//  Trunk
//
//  Sheet listing all active sprouts sorted by harvest date (soonest first).
//

import SwiftUI

struct UpcomingHarvestsView: View {
    let sprouts: [DerivedSprout]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.parchment.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                    if sprouts.isEmpty {
                        Text("No upcoming harvests")
                            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, TrunkTheme.space6)
                    } else {
                        VStack(spacing: 0) {
                            ForEach(Array(sprouts.enumerated()), id: \.element.id) { index, sprout in
                                if index > 0 {
                                    Divider().overlay(Color.borderSubtle)
                                }
                                SproutHarvestRow(sprout: sprout)
                                    .padding(TrunkTheme.space3)
                            }
                        }
                        .paperCard()
                    }
                }
                .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") { dismiss() }
                    .trunkFont(size: TrunkTheme.textSm)
                    .foregroundStyle(Color.inkFaint)
            }
            ToolbarItem(placement: .principal) {
                Text("UPCOMING HARVESTS")
                    .trunkFont(size: TrunkTheme.textBase)
                    .tracking(2)
                    .foregroundStyle(Color.wood)
            }
        }
        .presentationDetents([.medium, .large])
    }
}

// MARK: - Sprout Row

private struct SproutHarvestRow: View {
    let sprout: DerivedSprout

    private var harvestDate: Date {
        ProgressionService.harvestDate(plantedAt: sprout.plantedAt, season: sprout.season)
    }

    private var daysRemaining: Int {
        max(0, Int(ceil(harvestDate.timeIntervalSince(Date()) / 86400)))
    }

    private var progress: Double {
        min(1, max(0, ProgressionService.progress(plantedAt: sprout.plantedAt, season: sprout.season)))
    }

    private var percentage: Int {
        Int((progress * 100).rounded())
    }

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space1) {
            Text(sprout.title)
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.ink)
                .lineLimit(1)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 1.5)
                        .fill(Color.borderSubtle)
                        .frame(height: 3)
                    RoundedRectangle(cornerRadius: 1.5)
                        .fill(Color.twig)
                        .frame(width: geo.size.width * progress, height: 3)
                }
            }
            .frame(height: 3)

            HStack {
                Text("\(percentage)%")
                Spacer()
                if daysRemaining == 0 {
                    Text("Ready")
                        .fontWeight(.medium)
                        .foregroundStyle(Color.twig)
                } else {
                    Text("\(daysRemaining)d")
                }
            }
            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
            .foregroundStyle(Color.inkFaint)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(sprout.title), \(percentage)% complete, \(daysRemaining == 0 ? "ready to harvest" : "\(daysRemaining) days remaining")")
    }
}

#Preview {
    NavigationStack {
        UpcomingHarvestsView(sprouts: [])
    }
}
