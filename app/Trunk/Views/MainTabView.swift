//
//  MainTabView.swift
//  Trunk
//
//  Root tab view container with Today, Tree, Sagas, and Settings tabs.
//

import SwiftUI
import SwiftData

struct MainTabView: View {
    @Bindable var progression: ProgressionViewModel

    @Query private var sprouts: [Sprout]

    private var readyToHarvestCount: Int {
        sprouts.filter { $0.state == .active && $0.isReady }.count
    }

    private var hasPendingActions: Bool {
        readyToHarvestCount > 0 || progression.canShine
    }

    var body: some View {
        TabView {
            NavigationStack {
                TodayView(progression: progression)
            }
            .tabItem {
                Label("Today", systemImage: "sun.horizon")
            }
            .badge(hasPendingActions ? "!" : nil)

            NavigationStack {
                OverviewView(progression: progression)
            }
            .tabItem {
                Label("Tree", systemImage: "tree")
            }

            NavigationStack {
                SagasView(progression: progression)
            }
            .tabItem {
                Label("Sagas", systemImage: "book.pages")
            }

            NavigationStack {
                SettingsView(progression: progression)
            }
            .tabItem {
                Label("Settings", systemImage: "gearshape")
            }
        }
        .tint(Color.wood)
    }
}

#Preview {
    MainTabView(progression: ProgressionViewModel())
        .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
