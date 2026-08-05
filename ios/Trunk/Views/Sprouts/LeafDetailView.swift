//
//  LeafDetailView.swift
//  Trunk
//
//  Detail view for a single leaf showing metadata and associated sprouts.
//

import SwiftUI

struct LeafDetailView: View {
    let leafId: String
    @Bindable var progression: ProgressionViewModel

    /// Cached so the view re-renders after a sprout is planted from here.
    @State private var cachedState: DerivedState?
    @State private var continueContext: ContinueLeafContext?

    private var state: DerivedState {
        cachedState ?? EventStore.shared.getState()
    }

    private var leaf: DerivedLeaf? {
        state.leaves[leafId]
    }

    private var locationLabel: String {
        guard let leaf else { return "" }
        return twigLocationLabel(for: leaf.twigId)
    }

    private var sproutsForLeaf: [DerivedSprout] {
        getSproutsForLeaf(from: state, leafId: leafId)
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

                        // Continue this leaf
                        continueSection(leaf)
                            .animatedCard(index: 1)

                        // Associated sprouts
                        sproutsSection
                            .animatedCard(index: 2)
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
        .onAppear {
            cachedState = EventStore.shared.getState()
        }
        .onChange(of: progression.version) {
            cachedState = EventStore.shared.getState()
        }
        .sheet(item: $continueContext) { ctx in
            NavigationStack {
                CreateSproutView(
                    nodeId: ctx.twigId,
                    progression: progression,
                    preselectedLeafId: ctx.leafId,
                    template: ctx.template
                )
            }
        }
    }

    // MARK: - Continue Section

    /// Plants another sprout into this leaf, pre-filled from its most recent
    /// sprout. Results in a plain `sprout_planted` event — no new event types.
    private func continueSection(_ leaf: DerivedLeaf) -> some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("CONTINUE")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                Button {
                    HapticManager.tap()
                    continueContext = ContinueLeafContext(leaf: leaf, state: state)
                } label: {
                    HStack(spacing: TrunkTheme.space1) {
                        Text("🌱")
                        Text("CONTINUE THIS LEAF")
                    }
                }
                .buttonStyle(.trunk)
                .accessibilityHint("Plants a new sprout on this leaf")

                Text(continueHint)
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(TrunkTheme.space3)
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }

    private var continueHint: String {
        if let recent = mostRecentSproutForLeaf(from: state, leafId: leafId) {
            return "Plant another sprout here, pre-filled from \"\(recent.title)\". Everything stays editable."
        }
        return "Plant the first sprout on this leaf."
    }

    // MARK: - Metadata Section

    private func metadataSection(_ leaf: DerivedLeaf) -> some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("DETAILS")
                .monoLabel(size: TrunkTheme.textXs)

            // Ordered progress across the saga, before the flat detail rows.
            if !sproutsForLeaf.isEmpty {
                LeafTimelineView(sprouts: sproutsForLeaf)
                    .padding(TrunkTheme.space3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.paper)
                    .overlay(Rectangle().stroke(Color.border, lineWidth: 1))
            }

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
