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
    }
}
