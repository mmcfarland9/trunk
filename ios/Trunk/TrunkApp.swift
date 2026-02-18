//
//  TrunkApp.swift
//  Trunk
//
//  Personal growth and goal-tracking app built around gardening metaphors.
//

import SwiftUI

@main
struct TrunkApp: App {
    @State private var authService = AuthService.shared
    @Environment(\.scenePhase) private var scenePhase

    init() {
        Task {
            await AuthService.shared.initialize()
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authService)
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .background {
                // Flush events to disk synchronously before app suspension
                // to prevent data loss from the debounced write window
                EventStore.shared.flushToDisk()
            }
        }
    }
}
