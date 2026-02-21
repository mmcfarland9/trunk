//
//  NextHarvestView.swift
//  Trunk
//
//  Next harvest countdown display for Today view.
//

import SwiftUI

struct NextHarvestView: View {
    let sprout: DerivedSprout
    let onTap: () -> Void

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
        Button {
            HapticManager.tap()
            onTap()
        } label: {
            VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                Text("NEXT HARVEST")
                    .monoLabel(size: TrunkTheme.textXs)

                HStack {
                    VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                        Text(sprout.title)
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(Color.ink)
                            .lineLimit(1)

                        Text("\(daysRemaining) day\(daysRemaining == 1 ? "" : "s") remaining")
                            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: TrunkTheme.space1) {
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
                        .frame(width: 80, height: 3)

                        Text("\(percentage)%")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                }
            }
            .padding(TrunkTheme.space3)
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(sprout.title), \(percentage)% complete, \(daysRemaining) day\(daysRemaining == 1 ? "" : "s") remaining")
        .accessibilityHint("Shows all upcoming harvests")
    }
}
