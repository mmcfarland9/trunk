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
    @State private var hasPendingActions = false

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
        .onAppear {
            refreshPendingActions()
        }
    }

    private func refreshPendingActions() {
        let state = EventStore.shared.getState()
        let readyCount = getActiveSprouts(from: state).filter { isSproutReady($0) }.count
        hasPendingActions = readyCount > 0 || progression.canShine
    }
}

#Preview {
    MainTabView(progression: ProgressionViewModel())
}
