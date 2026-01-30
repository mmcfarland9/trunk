//
//  WaterEntry.swift
//  Trunk
//
//  A journal entry when watering a sprout.
//

import Foundation
import SwiftData

@Model
final class WaterEntry {
    var id: String
    var timestamp: Date
    var content: String
    var prompt: String?

    @Relationship(inverse: \Sprout.waterEntries)
    var sprout: Sprout?

    init(id: String = UUID().uuidString, content: String = "", prompt: String? = nil) {
        self.id = id
        self.timestamp = Date()
        self.content = content
        self.prompt = prompt
    }
}
