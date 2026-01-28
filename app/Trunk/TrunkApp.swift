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
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Sprout.self,
            WaterEntry.self,
            Leaf.self,
            NodeData.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}
