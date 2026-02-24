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

// MARK: - Active Sprouts Section

struct ActiveSproutsSection: View {
    let sprouts: [DerivedSprout]
    let progression: ProgressionViewModel
    let onWater: (DerivedSprout) -> Void

    @State private var contentAppeared = false

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
            } else {
                VStack(spacing: 2) {
                    ForEach(Array(sprouts.prefix(5).enumerated()), id: \.element.id) { index, sprout in
                        ActiveSproutRow(sprout: sprout, progression: progression, onWater: onWater, wasWateredThisWeek: EventStore.shared.checkSproutWateredThisWeek(sproutId: sprout.id))
                            .opacity(contentAppeared ? 1 : 0)
                            .offset(y: contentAppeared ? 0 : 8)
                            .animation(
                                .trunkFadeIn.delay(Double(index) * 0.05),
                                value: contentAppeared
                            )
                    }
                    if sprouts.count > 5 {
                        Text("+ \(sprouts.count - 5) more")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                            .opacity(contentAppeared ? 1 : 0)
                            .animation(.trunkFadeIn.delay(0.25), value: contentAppeared)
                    }
                }
            }
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
        .onAppear {
            // Small delay to let layout settle, then fade content in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                contentAppeared = true
            }
        }
    }
}

struct ActiveSproutRow: View {
    let sprout: DerivedSprout
    let progression: ProgressionViewModel
    let onWater: (DerivedSprout) -> Void

    let wasWateredThisWeek: Bool

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

            if isSproutReady(sprout) {
                Text("READY")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.twig)
            } else {
                let progress = ProgressionService.progress(plantedAt: sprout.plantedAt, season: sprout.season)
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
                    .padding(.vertical, TrunkTheme.space1)
                    .frame(minHeight: 44)
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

#Preview {
    OverviewView(progression: ProgressionViewModel())
}
