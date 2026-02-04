//
//  ContentView.swift
//  Trunk
//
//  Created by Michael McFarland on 1/27/26.
//

import SwiftUI

struct ContentView: View {
    @Environment(AuthService.self) private var authService
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
    }

    private func syncOnOpen() async {
        guard authService.isAuthenticated else { return }

        // Smart sync: incremental if cache valid, full if not
        let result = await SyncService.shared.smartSync()

        if let error = result.error {
            print("Sync failed (\(result.mode.rawValue)): \(error)")
            // Don't do anything else - use cached data as fallback
        } else if result.pulled > 0 {
            print("Synced \(result.pulled) events (\(result.mode.rawValue))")
            progression.refresh()
        } else {
            print("Sync complete, no new events (\(result.mode.rawValue))")
        }

        // Start realtime subscription for instant sync
        SyncService.shared.subscribeToRealtime { _ in
            // Refresh UI when events arrive from other devices
            progression.refresh()
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthService.shared)
}
