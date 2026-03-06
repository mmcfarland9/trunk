//
//  MainTabView.swift
//  Trunk
//
//  Root tab view container with Today, Trunk, and Garden tabs.
//

import SwiftUI

struct MainTabView: View {
    @Bindable var progression: ProgressionViewModel

    @State private var selectedTab = 1
    @State private var hasPendingActions = false

    var body: some View {
        VStack(spacing: 0) {
            // Resource meters - always visible across all tabs
            // Hidden until first sync so defaults (10/10 soil) aren't shown as real data
            ResourceMetersView(progression: progression)
                .padding(.horizontal, TrunkTheme.space4)
                .padding(.vertical, TrunkTheme.space2)
                .background(Color.parchment)
                .opacity(progression.hasLoaded ? 1 : 0)
                .animation(.trunkFadeIn, value: progression.hasLoaded)

            TabView(selection: $selectedTab) {
                NavigationStack {
                    OverviewView(progression: progression)
                }
                .refreshable { await fullSync() }
                .tabItem {
                    Label("Trunk", systemImage: "tree")
                }
                .tag(0)

                NavigationStack {
                    TodayView(progression: progression)
                }
                .refreshable { await fullSync() }
                .tabItem {
                    Label("Today", systemImage: "sun.horizon")
                }
                .tag(1)
                .badge(hasPendingActions ? "!" : nil)

                NavigationStack {
                    SproutsView(progression: progression)
                }
                .refreshable { await fullSync() }
                .tabItem {
                    Label("Garden", systemImage: "leaf")
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
        .onChange(of: progression.version) {
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
