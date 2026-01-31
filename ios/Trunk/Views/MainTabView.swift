//
//  MainTabView.swift
//  Trunk
//
//  Root tab view container with Today, Tree, and Settings tabs.
//

import SwiftUI
import SwiftData

struct MainTabView: View {
    @Bindable var progression: ProgressionViewModel

    @Query private var sprouts: [Sprout]
    @State private var selectedTab = 0

    private var readyToHarvestCount: Int {
        sprouts.filter { $0.state == .active && $0.isReady }.count
    }

    private var hasPendingActions: Bool {
        readyToHarvestCount > 0 || progression.canShine
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                TodayView(progression: progression)
            }
            .tabItem {
                Label("Today", systemImage: "sun.horizon")
            }
            .tag(0)
            .badge(hasPendingActions ? "!" : nil)

            NavigationStack {
                OverviewView(progression: progression)
            }
            .tabItem {
                Label("Trunk", systemImage: "tree")
            }
            .tag(1)

            NavigationStack {
                SettingsView(progression: progression)
            }
            .tabItem {
                Label("Settings", systemImage: "gearshape")
            }
            .tag(2)
        }
        .tint(Color.wood)
        .transaction { transaction in
            transaction.animation = nil
        }
    }
}

#Preview {
    MainTabView(progression: ProgressionViewModel())
        .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
