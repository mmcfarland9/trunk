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
    var note: String

    @Relationship(inverse: \Sprout.waterEntries)
    var sprout: Sprout?

    init(id: String = UUID().uuidString, note: String = "") {
        self.id = id
        self.timestamp = Date()
        self.note = note
    }
}
