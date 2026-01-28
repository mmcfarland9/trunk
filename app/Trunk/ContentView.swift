//
//  ContentView.swift
//  Trunk
//
//  Created by Michael McFarland on 1/27/26.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var sprouts: [Sprout]

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "tree")
                    .font(.system(size: 60))
                    .foregroundStyle(.green)

                Text("Trunk")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Reap what you sow")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Text("\(sprouts.count) sprouts")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .navigationTitle("Trunk")
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self], inMemory: true)
}
