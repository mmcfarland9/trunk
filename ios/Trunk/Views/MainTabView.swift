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
        VStack(spacing: 0) {
            // Resource meters - always visible across all tabs
            ResourceMetersView(progression: progression)
                .padding(.horizontal, TrunkTheme.space4)
                .padding(.vertical, TrunkTheme.space2)
                .background(Color.parchment)

            TabView(selection: $selectedTab) {
                NavigationStack {
                    TodayView(progression: progression)
                }
                .refreshable { await fullSync() }
                .tabItem {
                    Label("Today", systemImage: "sun.horizon")
                }
                .tag(0)
                .badge(hasPendingActions ? "!" : nil)

                NavigationStack {
                    OverviewView(progression: progression)
                }
                .refreshable { await fullSync() }
                .tabItem {
                    Label("Trunk", systemImage: "tree")
                }
                .tag(1)

                NavigationStack {
                    SproutsView(progression: progression)
                }
                .refreshable { await fullSync() }
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
        .onAppear {
            refreshPendingActions()
        }
    }

    private func fullSync() async {
        let _ = await SyncService.shared.forceFullSync()
        progression.refresh()
        refreshPendingActions()
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
