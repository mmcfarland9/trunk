//
//  OverviewView.swift
//  Trunk
//
//  Main tree overview showing all 8 branches around the trunk.
//

import SwiftUI
import SwiftData

struct OverviewView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var sprouts: [Sprout]
    @Bindable var progression: ProgressionViewModel

    @State private var sproutToWater: Sprout?
    @State private var navigateToBranch: Int? = nil

    var body: some View {
        NavigationStack {
            ZStack {
                // Parchment background
                Color.parchment
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Resource meters at top
                    ResourceMetersView(progression: progression)
                        .padding(.horizontal, TrunkTheme.space4)
                        .padding(.top, TrunkTheme.space2)

                    // Interactive tree canvas with zoom gestures
                    TreeCanvasView(
                        sprouts: sprouts,
                        progression: progression,
                        onNavigateToBranch: { branchIndex in
                            navigateToBranch = branchIndex
                        }
                    )
                    .frame(maxHeight: .infinity)

                    // Active sprouts section
                    ActiveSproutsSection(
                        sprouts: activeSprouts,
                        progression: progression,
                        onWater: { sprout in
                            sproutToWater = sprout
                        }
                    )
                    .padding(.horizontal, TrunkTheme.space4)
                    .padding(.bottom, TrunkTheme.space4)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("TRUNK")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .tracking(3)
                        .foregroundStyle(Color.wood)
                }
            }
            .onAppear {
                progression.refresh()
            }
            .sheet(item: $sproutToWater) { sprout in
                NavigationStack {
                    WaterSproutView(sprout: sprout, progression: progression)
                }
                .presentationDetents([.medium])
            }
            .navigationDestination(item: $navigateToBranch) { branchIndex in
                BranchView(branchIndex: branchIndex, progression: progression)
            }
        }
    }

    private var activeSprouts: [Sprout] {
        sprouts.filter { $0.state == .active }
    }
}

// MARK: - Resource Meters

struct ResourceMetersView: View {
    let progression: ProgressionViewModel

    var body: some View {
        HStack(spacing: TrunkTheme.space3) {
            // Soil meter - horizontal bar with fill
            HStack(spacing: 4) {
                Text("Soil:")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)

                SoilMeter(
                    available: progression.soilAvailable,
                    capacity: progression.soilCapacity
                )
                .frame(width: 60)

                Text(String(format: "%.2f/%.2f", progression.soilAvailable, progression.soilCapacity))
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.twig)
            }

            Spacer()

            // Water meter - circles
            HStack(spacing: 4) {
                Text("Water:")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)

                HStack(spacing: 2) {
                    ForEach(0..<progression.waterCapacity, id: \.self) { i in
                        Circle()
                            .fill(i < progression.waterAvailable ? Color.trunkWater : Color.clear)
                            .frame(width: 6, height: 6)
                            .overlay(
                                Circle()
                                    .stroke(Color.trunkWater, lineWidth: 1)
                            )
                    }
                }
            }

            // Sun meter - circle
            HStack(spacing: 4) {
                Text("Sun:")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)

                HStack(spacing: 2) {
                    ForEach(0..<progression.sunCapacity, id: \.self) { i in
                        Circle()
                            .fill(i < progression.sunAvailable ? Color.trunkSun : Color.clear)
                            .frame(width: 6, height: 6)
                            .overlay(
                                Circle()
                                    .stroke(Color.trunkSun, lineWidth: 1)
                            )
                    }
                }
            }
        }
        .padding(.horizontal, TrunkTheme.space2)
        .padding(.vertical, TrunkTheme.space2)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }
}

struct SoilMeter: View {
    let available: Double
    let capacity: Double

    private var fillPercent: Double {
        guard capacity > 0 else { return 0 }
        return min(1.0, available / capacity)
    }

    var body: some View {
        GeometryReader { geo in
            let filledWidth = geo.size.width * fillPercent

            ZStack(alignment: .leading) {
                // Track background
                Rectangle()
                    .fill(Color.twig.opacity(0.15))

                // Fill
                Rectangle()
                    .fill(Color.twig)
                    .frame(width: max(0, filledWidth))
            }
            .overlay(
                Rectangle()
                    .stroke(Color.twig.opacity(0.5), lineWidth: 1)
            )
        }
        .frame(height: 6)
    }
}

// MARK: - Active Sprouts Section

struct ActiveSproutsSection: View {
    let sprouts: [Sprout]
    let progression: ProgressionViewModel
    let onWater: (Sprout) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("ACTIVE SPROUTS")
                .monoLabel(size: TrunkTheme.textXs)

            if sprouts.isEmpty {
                Text("No active sprouts")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .italic()
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, TrunkTheme.space3)
            } else {
                VStack(spacing: 2) {
                    ForEach(sprouts.prefix(5), id: \.id) { sprout in
                        ActiveSproutRow(sprout: sprout, progression: progression, onWater: onWater)
                    }
                    if sprouts.count > 5 {
                        Text("+ \(sprouts.count - 5) more")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                }
            }
        }
        .frame(height: 160)
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }
}

struct ActiveSproutRow: View {
    let sprout: Sprout
    let progression: ProgressionViewModel
    let onWater: (Sprout) -> Void

    private var wasWateredThisWeek: Bool {
        guard let lastWater = sprout.waterEntries.max(by: { $0.timestamp < $1.timestamp }) else {
            return false
        }
        let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        return lastWater.timestamp > weekAgo
    }

    var body: some View {
        HStack(spacing: TrunkTheme.space2) {
            // Left border indicator
            Rectangle()
                .fill(Color.twig)
                .frame(width: 2)

            VStack(alignment: .leading, spacing: 1) {
                Text(sprout.title)
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.ink)
                    .lineLimit(1)

                Text(sprout.season.label)
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            Spacer()

            if sprout.isReady {
                Text("READY")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.twig)
            } else if let plantedAt = sprout.plantedAt {
                let progress = ProgressionService.progress(plantedAt: plantedAt, season: sprout.season)
                Text("\(Int(progress * 100))%")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            // Water button
            Button {
                HapticManager.tap()
                onWater(sprout)
            } label: {
                Text(wasWateredThisWeek ? "Watered" : "Water")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(wasWateredThisWeek ? Color.inkFaint : Color.trunkWater)
                    .padding(.horizontal, TrunkTheme.space2)
                    .padding(.vertical, 2)
                    .overlay(
                        Rectangle()
                            .stroke(wasWateredThisWeek ? Color.border : Color.trunkWater, lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
            .disabled(wasWateredThisWeek || !progression.canWater)
        }
        .padding(.vertical, TrunkTheme.space1)
    }
}

struct CircularProgressView: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.border, lineWidth: 2)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(Color.twig, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                .rotationEffect(.degrees(-90))

            Text("\(Int(progress * 100))%")
                .font(.system(size: 8, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
    }
}

#Preview {
    OverviewView(progression: ProgressionViewModel())
        .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
