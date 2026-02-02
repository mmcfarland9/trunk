//
//  TrunkApp.swift
//  Trunk
//
//  Personal growth and goal-tracking app built around gardening metaphors.
//

import SwiftUI
import SwiftData

@main
struct TrunkApp: App {
    @State private var authService = AuthService.shared

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Sprout.self,
            WaterEntry.self,
            Leaf.self,
            NodeData.self,
            SunEntry.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            print("ModelContainer error details: \(error)")
            print("Error localized: \(error.localizedDescription)")
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

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
        .modelContainer(sharedModelContainer)
    }
}
