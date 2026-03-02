//
//  ShineSectionView.swift
//  Trunk
//
//  Shine on garden section for Today view.
//

import SwiftUI

struct ShineSectionView: View {
    let canShine: Bool
    let onTap: () -> Void

    var body: some View {
        Button {
            HapticManager.tap()
            onTap()
        } label: {
            HStack {
                Text("☀️")
                Text("Shine on your garden")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .foregroundStyle(canShine ? Color.ink : Color.inkFaint)

                Spacer()
            }
            .padding(TrunkTheme.space3)
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(canShine ? Color.trunkSun : Color.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(!canShine)

        if !canShine {
            Text("Sun restores Monday at 6:00 AM")
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
                .padding(.top, TrunkTheme.space1)
        }
    }
}
