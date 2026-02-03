//
//  ContentView.swift
//  Trunk
//
//  Created by Michael McFarland on 1/27/26.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(AuthService.self) private var authService
    @Environment(\.modelContext) private var modelContext
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

        do {
            let pulled = try await SyncService.shared.pullAllEvents()
            if pulled > 0 {
                print("Synced \(pulled) events from cloud")
                progression.refresh()
            }

            // Start realtime subscription for instant sync
            SyncService.shared.subscribeToRealtime { _ in
                // Refresh UI when events arrive from other devices
                progression.refresh()
            }
        } catch {
            print("Sync failed: \(error)")
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthService.shared)
        .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
