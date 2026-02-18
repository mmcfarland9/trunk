//
//  BloomDescriptionsView.swift
//  Trunk
//
//  Shared component for displaying bloom descriptions (wither/budding/flourish).
//  Used by HarvestSproutView and SproutActionsView.
//

import SwiftUI

struct BloomDescriptionsView: View {
    let bloomWither: String?
    let bloomBudding: String?
    let bloomFlourish: String?

    var hasContent: Bool {
        bloomWither?.isEmpty == false ||
        bloomBudding?.isEmpty == false ||
        bloomFlourish?.isEmpty == false
    }

    var body: some View {
        if hasContent {
            VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                if let wither = bloomWither, !wither.isEmpty {
                    bloomRow(level: "1/5", label: "Withering", text: wither)
                }
                if let budding = bloomBudding, !budding.isEmpty {
                    bloomRow(level: "3/5", label: "Budding", text: budding)
                }
                if let flourish = bloomFlourish, !flourish.isEmpty {
                    bloomRow(level: "5/5", label: "Flourishing", text: flourish)
                }
            }
        }
    }

    private func bloomRow(level: String, label: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space1) {
            Text("\(level) \(label)")
                .trunkFont(size: TrunkTheme.textXs, weight: .medium)
                .foregroundStyle(Color.inkFaint)
            Text(text)
                .trunkFont(size: TrunkTheme.textSm)
                .foregroundStyle(Color.inkLight)
        }
    }
}
