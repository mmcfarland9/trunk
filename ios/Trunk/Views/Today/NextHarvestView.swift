//
//  NextHarvestView.swift
//  Trunk
//
//  Next harvest countdown display for Today view.
//

import SwiftUI

struct NextHarvestView: View {
    let sprout: DerivedSprout

    private var harvestDate: Date {
        ProgressionService.harvestDate(plantedAt: sprout.plantedAt, season: sprout.season)
    }

    private var daysRemaining: Int {
        max(0, Int(ceil(harvestDate.timeIntervalSince(Date()) / 86400)))
    }

    private var progress: Double {
        ProgressionService.progress(plantedAt: sprout.plantedAt, season: sprout.season)
    }

    private var percentage: Int {
        Int((progress * 100).rounded())
    }

    private var progressBar: String {
        let barTotal = 10
        let filled = Int(progress * Double(barTotal))
        let clampedFilled = min(barTotal, max(0, filled))
        let barFilled = String(repeating: "\u{2501}", count: clampedFilled)
        let barEmpty = String(repeating: "\u{2500}", count: barTotal - clampedFilled)
        return "[\(barFilled)\(barEmpty)]"
    }

    var body: some View {
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
                    Text(progressBar)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.twig)

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
}
