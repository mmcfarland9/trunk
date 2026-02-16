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
    }
}
