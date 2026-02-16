//
//  WaterSectionView.swift
//  Trunk
//
//  Water sprouts section for Today view.
//

import SwiftUI

struct WaterSectionView: View {
    let canWater: Bool
    let onTap: () -> Void

    var body: some View {
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
    }
}
