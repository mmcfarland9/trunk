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

                    // Tree visualization
                    TreeView(sprouts: sprouts, progression: progression)
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

// MARK: - Tree View

struct TreeView: View {
    let sprouts: [Sprout]
    let progression: ProgressionViewModel

    private let branchCount = TrunkConstants.Tree.branchCount

    // Wind animation constants (gentle breeze)
    private let windAmplitude: CGFloat = 6.0  // pixels of sway
    private let windSpeed: Double = 0.4       // base speed multiplier

    var body: some View {
        TimelineView(.animation) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate

            GeometryReader { geo in
                let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
                let radius = min(geo.size.width, geo.size.height) * 0.38

                ZStack {
                    // Branch lines (ASCII-style dashed) - these sway too
                    ForEach(0..<branchCount, id: \.self) { index in
                        let angle = angleForBranch(index)
                        let windOffset = windOffsetFor(index: index, time: time)
                        let endPoint = pointOnCircle(center: center, radius: radius, angle: angle)
                        let swayedEnd = CGPoint(x: endPoint.x + windOffset.x, y: endPoint.y + windOffset.y)

                        Path { path in
                            path.move(to: center)
                            path.addLine(to: swayedEnd)
                        }
                        .stroke(Color.inkFaint.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                    }

                    // Trunk (center) - slight sway
                    VStack(spacing: 2) {
                        Text("*")
                            .font(.system(size: 32, design: .monospaced))
                            .foregroundStyle(Color.wood)
                    }
                    .position(center)
                    .offset(x: sin(time * windSpeed * 0.3) * windAmplitude * 0.3,
                            y: cos(time * windSpeed * 0.25) * windAmplitude * 0.2)

                    // Branch nodes - each with unique phase
                    ForEach(0..<branchCount, id: \.self) { index in
                        let angle = angleForBranch(index)
                        let position = pointOnCircle(center: center, radius: radius, angle: angle)
                        let branchSprouts = sproutsForBranch(index)
                        let hasActive = branchSprouts.contains { $0.state == .active }
                        let windOffset = windOffsetFor(index: index, time: time)

                        NavigationLink(destination: BranchView(branchIndex: index, progression: progression)) {
                            BranchNode(
                                index: index,
                                hasActiveSprouts: hasActive,
                                activeSproutCount: branchSprouts.filter { $0.state == .active }.count
                            )
                        }
                        .position(x: position.x + windOffset.x, y: position.y + windOffset.y)
                    }
                }
            }
        }
    }

    /// Calculate wind offset for a branch based on its index and current time
    private func windOffsetFor(index: Int, time: Double) -> CGPoint {
        // Each branch has a unique phase based on its index
        let phase = Double(index) * 0.7 + Double(index * index) * 0.13
        // Slightly different speeds per branch for organic feel
        let speed = windSpeed * (0.85 + Double(index % 3) * 0.1)

        let x = sin(time * speed + phase) * windAmplitude
        let y = cos(time * speed * 0.8 + phase) * windAmplitude * 0.6

        return CGPoint(x: x, y: y)
    }

    private func angleForBranch(_ index: Int) -> Double {
        let startAngle = -Double.pi / 2
        let angleStep = (2 * Double.pi) / Double(branchCount)
        return startAngle + Double(index) * angleStep
    }

    private func pointOnCircle(center: CGPoint, radius: Double, angle: Double) -> CGPoint {
        CGPoint(
            x: center.x + radius * cos(angle),
            y: center.y + radius * sin(angle)
        )
    }

    private func sproutsForBranch(_ branchIndex: Int) -> [Sprout] {
        sprouts.filter { sprout in
            sprout.nodeId.hasPrefix("branch-\(branchIndex)")
        }
    }
}

// MARK: - Branch Node

struct BranchNode: View {
    let index: Int
    let hasActiveSprouts: Bool
    let activeSproutCount: Int

    var body: some View {
        VStack(spacing: 2) {
            // ASCII-style box
            VStack(spacing: 0) {
                Text("┌──────┐")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(Color.inkFaint.opacity(0.5))

                Text(SharedConstants.Tree.branchName(index))
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(hasActiveSprouts ? Color.wood : Color.inkFaint)

                Text("└──────┘")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(Color.inkFaint.opacity(0.5))
            }

            // Sprout indicator
            if activeSproutCount > 0 {
                Text("*\(activeSproutCount)")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(Color.twig)
            }
        }
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
