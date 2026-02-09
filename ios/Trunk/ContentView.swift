//
//  ContentView.swift
//  Trunk
//
//  Created by Michael McFarland on 1/27/26.
//

import SwiftUI

struct ContentView: View {
    @Environment(AuthService.self) private var authService
    @Environment(\.scenePhase) private var scenePhase
    @State private var progression = ProgressionViewModel()

    var body: some View {
        Group {
            if authService.isLoading {
                ProgressView("Loading...")
            } else if SupabaseClientProvider.isConfigured && !authService.isAuthenticated {
                LoginView()
            } else {
                MainTabView(progression: progression)
                    .task {
                        await syncOnOpen()
                    }
            }
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                // Invalidate time-sensitive caches (water/sun availability)
                // when app returns to foreground - may have crossed 6am boundary
                progression.refresh()

                // Re-sync from cloud on foreground return
                Task {
                    await syncOnOpen()
                }
            }
        }
    }

    private func syncOnOpen() async {
        guard authService.isAuthenticated else { return }

        let result = await SyncService.shared.smartSync()

        // Always refresh state after sync - even with 0 new events,
        // derived state needs to reflect current time (water/sun resets)
        progression.refresh()

        // Only subscribe once (idempotent - unsubscribes first internally)
        if result.error == nil {
            SyncService.shared.subscribeToRealtime { _ in
                progression.refresh()
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthService.shared)
}
