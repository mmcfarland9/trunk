//
//  MainTabView.swift
//  Trunk
//
//  Root tab view container with Today, Tree, and Sprouts tabs.
//

import SwiftUI

struct MainTabView: View {
    @Bindable var progression: ProgressionViewModel

    @State private var selectedTab = 0

    // Derived state from EventStore
    private var state: DerivedState {
        EventStore.shared.getState()
    }

    private var readyToHarvestCount: Int {
        getActiveSprouts(from: state).filter { isSproutReady($0) }.count
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
                SproutsView(progression: progression)
            }
            .tabItem {
                Label("Sprouts", systemImage: "leaf")
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
}
