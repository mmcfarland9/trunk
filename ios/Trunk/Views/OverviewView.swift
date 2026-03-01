//
//  OverviewView.swift
//  Trunk
//
//  Main tree overview showing all 8 branches around the trunk.
//

import SwiftUI

struct OverviewView: View {
    @Bindable var progression: ProgressionViewModel

    @State private var sproutToWater: DerivedSprout?
    @State private var navigateToBranch: Int? = nil
    @State private var navigationCooldown = false

    // Cached state (updated in .onAppear and .onChange)
    @State private var cachedSprouts: [DerivedSprout] = []

    private func refreshCachedState() {
        let state = EventStore.shared.getState()
        cachedSprouts = Array(state.sprouts.values)
    }

    var body: some View {
        ZStack {
            // Parchment background
            Color.parchment
                .ignoresSafeArea()

            // Interactive tree canvas with zoom gestures
            TreeCanvasView(
                sprouts: cachedSprouts,
                progression: progression,
                onNavigateToBranch: { branchIndex in
                    guard !navigationCooldown else { return }
                    navigateToBranch = branchIndex
                }
            )
            .frame(maxHeight: .infinity)
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
            refreshCachedState()
        }
        .onChange(of: progression.version) {
            refreshCachedState()
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
        .onChange(of: navigateToBranch) { oldValue, newValue in
            // When navigating back (branch -> nil), activate cooldown to
            // prevent stray taps from immediately re-triggering navigation.
            if oldValue != nil && newValue == nil {
                navigationCooldown = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    navigationCooldown = false
                }
            }
        }
    }
}

// MARK: - Resource Meters

struct ResourceMetersView: View {
    let progression: ProgressionViewModel

    @State private var soilCelebrating = false
    @State private var waterCelebrating = false
    @State private var sunCelebrating = false

    var body: some View {
        HStack(spacing: TrunkTheme.space3) {
            // Soil meter - horizontal bar with fill
            HStack(spacing: TrunkTheme.space1) {
                Text("Soil:")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .fixedSize()

                SoilMeter(
                    available: progression.soilAvailable,
                    capacity: progression.soilCapacity
                )
                .frame(width: 60)

                Text(String(format: "%.2f/%.2f", progression.soilAvailable, progression.soilCapacity))
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.twig)
                    .fixedSize()
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Soil: \(String(format: "%.1f", progression.soilAvailable)) of \(String(format: "%.1f", progression.soilCapacity))")
            .scaleEffect(soilCelebrating ? 1.08 : 1.0)
            .animation(.trunkBounce, value: soilCelebrating)
            .onChange(of: progression.soilAvailable) {
                soilCelebrating = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                    soilCelebrating = false
                }
            }

            Spacer()

            // Water meter - circles
            HStack(spacing: TrunkTheme.space1) {
                Text("Water:")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)

                HStack(spacing: 2) {
                    ForEach(0..<progression.waterCapacity, id: \.self) { i in
                        let isFilled = i < progression.waterAvailable
                        Circle()
                            .fill(isFilled ? Color.trunkWater : Color.clear)
                            .frame(width: 6, height: 6)
                            .overlay(
                                Circle()
                                    .stroke(Color.trunkWater, lineWidth: 1)
                            )
                            .scaleEffect(isFilled ? 1.0 : 0.8)
                            .animation(.trunkQuick, value: isFilled)
                    }
                }
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Water: \(progression.waterAvailable) of \(progression.waterCapacity)")
            .scaleEffect(waterCelebrating ? 1.08 : 1.0)
            .animation(.trunkBounce, value: waterCelebrating)
            .onChange(of: progression.waterAvailable) {
                waterCelebrating = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                    waterCelebrating = false
                }
            }

            // Sun meter - circle
            HStack(spacing: TrunkTheme.space1) {
                Text("Sun:")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)

                HStack(spacing: 2) {
                    ForEach(0..<progression.sunCapacity, id: \.self) { i in
                        let isFilled = i < progression.sunAvailable
                        Circle()
                            .fill(isFilled ? Color.trunkSun : Color.clear)
                            .frame(width: 6, height: 6)
                            .overlay(
                                Circle()
                                    .stroke(Color.trunkSun, lineWidth: 1)
                            )
                            .scaleEffect(isFilled ? 1.0 : 0.8)
                            .animation(.trunkQuick, value: isFilled)
                    }
                }
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Sun: \(progression.sunAvailable) of \(progression.sunCapacity)")
            .scaleEffect(sunCelebrating ? 1.08 : 1.0)
            .animation(.trunkBounce, value: sunCelebrating)
            .onChange(of: progression.sunAvailable) {
                sunCelebrating = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                    sunCelebrating = false
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

                // Fill - animated width changes
                Rectangle()
                    .fill(Color.twig)
                    .frame(width: max(0, filledWidth))
                    .animation(.trunkSpring, value: fillPercent)
            }
            .overlay(
                Rectangle()
                    .stroke(Color.twig.opacity(0.5), lineWidth: 1)
            )
        }
        .frame(height: 6)
    }
}

#Preview {
    OverviewView(progression: ProgressionViewModel())
}
