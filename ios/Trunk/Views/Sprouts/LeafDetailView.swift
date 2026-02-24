//
//  LeafDetailView.swift
//  Trunk
//
//  Detail view for a single leaf showing metadata and associated sprouts.
//

import SwiftUI

struct LeafDetailView: View {
    let leafId: String

    private var state: DerivedState {
        EventStore.shared.getState()
    }

    private var leaf: DerivedLeaf? {
        state.leaves[leafId]
    }

    private var locationLabel: String {
        guard let leaf else { return "" }
        return twigLocationLabel(for: leaf.twigId)
    }

    private var sproutsForLeaf: [DerivedSprout] {
        state.sprouts.values
            .filter { $0.leafId == leafId }
            .sorted { $0.plantedAt > $1.plantedAt }
    }

    private var activeSproutCount: Int {
        sproutsForLeaf.filter { $0.state == .active }.count
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter
    }()

    private var formattedCreatedDate: String {
        guard let leaf else { return "" }
        return Self.dateFormatter.string(from: leaf.createdAt)
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            if let leaf {
                ScrollView {
                    VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                        // Metadata section
                        metadataSection(leaf)
                            .animatedCard(index: 0)

                        // Associated sprouts
                        sproutsSection
                            .animatedCard(index: 1)
                    }
                    .padding(TrunkTheme.space4)
                }
            } else {
                Text("Leaf not found")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text((leaf?.name ?? "LEAF").uppercased())
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
                    .lineLimit(1)
            }
        }
    }

    // MARK: - Metadata Section

    private func metadataSection(_ leaf: DerivedLeaf) -> some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("DETAILS")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 0) {
                detailRow(label: "Location", value: locationLabel)

                Divider().overlay(Color.borderSubtle)

                detailRow(label: "Created", value: formattedCreatedDate)

                Divider().overlay(Color.borderSubtle)

                detailRow(label: "Sprouts", value: "\(sproutsForLeaf.count)")

                if activeSproutCount > 0 {
                    Divider().overlay(Color.borderSubtle)

                    detailRow(label: "Active", value: "\(activeSproutCount)", valueColor: Color.twig)
                }
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }

    private func detailRow(label: String, value: String, valueColor: Color = Color.ink) -> some View {
        HStack {
            Text(label)
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Spacer()

            Text(value)
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(valueColor)
        }
        .padding(TrunkTheme.space3)
    }

    // MARK: - Sprouts Section

    private var sproutsSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("SPROUTS (\(sproutsForLeaf.count))")
                .monoLabel(size: TrunkTheme.textXs)

            if sproutsForLeaf.isEmpty {
                VStack(spacing: TrunkTheme.space3) {
                    Text("No sprouts")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, TrunkTheme.space5)
                .padding(.horizontal, TrunkTheme.space4)
                .background(Color.paper)
                .overlay(
                    Rectangle()
                        .stroke(Color.border, lineWidth: 1)
                )
            } else {
                VStack(spacing: TrunkTheme.space2) {
                    ForEach(sproutsForLeaf, id: \.id) { sprout in
                        NavigationLink {
                            SproutDetailView(sproutId: sprout.id)
                        } label: {
                            SproutListRow(sprout: sprout, state: state)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}
