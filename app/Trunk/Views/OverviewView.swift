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

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Resource meters
                    ResourceMetersView(progression: progression)
                        .padding(.horizontal)

                    // Tree visualization
                    TreeView(sprouts: sprouts)
                        .frame(height: 350)

                    // Active sprouts section
                    ActiveSproutsSection(sprouts: activeSprouts)
                        .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Trunk")
            .onAppear {
                progression.refresh()
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
        HStack(spacing: 16) {
            // Soil meter
            VStack(alignment: .leading, spacing: 4) {
                Label("Soil", systemImage: "leaf.fill")
                    .font(.caption)
                    .foregroundStyle(.brown)

                ProgressView(
                    value: progression.soilAvailable,
                    total: progression.soilCapacity
                )
                .tint(.brown)

                Text("\(progression.soilAvailableInt) / \(progression.soilCapacityInt)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)

            // Water meter
            VStack(alignment: .leading, spacing: 4) {
                Label("Water", systemImage: "drop.fill")
                    .font(.caption)
                    .foregroundStyle(.blue)

                HStack(spacing: 4) {
                    ForEach(0..<progression.waterCapacity, id: \.self) { i in
                        Circle()
                            .fill(i < progression.waterAvailable ? Color.blue : Color.blue.opacity(0.2))
                            .frame(width: 16, height: 16)
                    }
                }

                Text("\(progression.waterAvailable) / \(progression.waterCapacity)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            // Sun meter
            VStack(alignment: .leading, spacing: 4) {
                Label("Sun", systemImage: "sun.max.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)

                HStack(spacing: 4) {
                    ForEach(0..<progression.sunCapacity, id: \.self) { i in
                        Circle()
                            .fill(i < progression.sunAvailable ? Color.orange : Color.orange.opacity(0.2))
                            .frame(width: 16, height: 16)
                    }
                }

                Text("\(progression.sunAvailable) / \(progression.sunCapacity)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Tree View

struct TreeView: View {
    let sprouts: [Sprout]

    private let branchCount = TrunkConstants.Tree.branchCount

    var body: some View {
        GeometryReader { geo in
            let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
            let radius = min(geo.size.width, geo.size.height) * 0.35

            ZStack {
                // Branch lines
                ForEach(0..<branchCount, id: \.self) { index in
                    let angle = angleForBranch(index)
                    let endPoint = pointOnCircle(center: center, radius: radius, angle: angle)

                    Path { path in
                        path.move(to: center)
                        path.addLine(to: endPoint)
                    }
                    .stroke(Color.brown.opacity(0.5), lineWidth: 3)
                }

                // Trunk (center)
                Circle()
                    .fill(Color.brown)
                    .frame(width: 60, height: 60)
                    .position(center)

                Image(systemName: "tree")
                    .font(.title)
                    .foregroundStyle(.white)
                    .position(center)

                // Branch nodes
                ForEach(0..<branchCount, id: \.self) { index in
                    let angle = angleForBranch(index)
                    let position = pointOnCircle(center: center, radius: radius, angle: angle)
                    let branchSprouts = sproutsForBranch(index)

                    NavigationLink(destination: BranchView(branchIndex: index, progression: ProgressionViewModel())) {
                        BranchNode(
                            index: index,
                            activeSproutCount: branchSprouts.filter { $0.state == .active }.count
                        )
                    }
                    .position(position)
                }
            }
        }
    }

    private func angleForBranch(_ index: Int) -> Double {
        // Start from top (-90°) and go clockwise
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
    let activeSproutCount: Int

    private let branchNames = [
        "Health", "Career", "Relations", "Finance",
        "Growth", "Creative", "Home", "Adventure"
    ]

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.8))
                    .frame(width: 50, height: 50)

                Text("\(index + 1)")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                if activeSproutCount > 0 {
                    Text("\(activeSproutCount)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .padding(4)
                        .background(Color.orange)
                        .clipShape(Circle())
                        .offset(x: 18, y: -18)
                }
            }

            Text(branchNames[index])
                .font(.caption2)
                .foregroundStyle(.primary)
        }
    }
}

// MARK: - Active Sprouts Section

struct ActiveSproutsSection: View {
    let sprouts: [Sprout]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Active Sprouts")
                .font(.headline)

            if sprouts.isEmpty {
                Text("No active sprouts. Tap a branch to plant one!")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                ForEach(sprouts, id: \.id) { sprout in
                    ActiveSproutRow(sprout: sprout)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct ActiveSproutRow: View {
    let sprout: Sprout

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(sprout.title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(sprout.season.label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if sprout.isReady {
                Label("Ready", systemImage: "checkmark.circle.fill")
                    .font(.caption)
                    .foregroundStyle(.green)
            } else if let plantedAt = sprout.plantedAt {
                let progress = ProgressionService.progress(plantedAt: plantedAt, season: sprout.season)
                CircularProgressView(progress: progress)
                    .frame(width: 30, height: 30)
            }
        }
        .padding(.vertical, 4)
    }
}

struct CircularProgressView: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.green.opacity(0.2), lineWidth: 3)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(Color.green, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))

            Text("\(Int(progress * 100))%")
                .font(.system(size: 8))
                .fontWeight(.medium)
        }
    }
}

#Preview {
    OverviewView(progression: ProgressionViewModel())
        .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self], inMemory: true)
}
