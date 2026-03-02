//
//  WaterSectionView.swift
//  Trunk
//
//  Water sprouts section for Today view.
//

import SwiftUI

struct WaterSectionView: View {
    let canWater: Bool
    let hasActiveSprouts: Bool
    let wateringStreak: Int
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                HapticManager.tap()
                onTap()
            } label: {
                HStack {
                    Text("💧")
                    Text("Water your sprouts")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(canWater ? Color.ink : Color.inkFaint)

                    Spacer()

                    if wateringStreak > 0 {
                        Text("\(wateringStreak)d streak")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.trunkWater.opacity(0.7))
                    }
                }
                .padding(TrunkTheme.space3)
                .background(Color.paper)
                .overlay(
                    Rectangle()
                        .stroke(canWater ? Color.trunkWater : Color.border, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
            .disabled(!canWater)

            if !canWater && !hasActiveSprouts {
                Text("Plant your first sprout to start watering")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .padding(.top, TrunkTheme.space1)
            }
        }
    }
}
