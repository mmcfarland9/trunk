//
//  ContentView.swift
//  Trunk
//
//  Created by Michael McFarland on 1/27/26.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @State private var progression = ProgressionViewModel()

    var body: some View {
        OverviewView(progression: progression)
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self], inMemory: true)
}
