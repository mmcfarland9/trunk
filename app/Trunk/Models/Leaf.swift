//
//  Leaf.swift
//  Trunk
//
//  A saga of related sprouts - a continuing story.
//

import Foundation
import SwiftData

@Model
final class Leaf {
    var id: String
    var name: String
    var nodeId: String
    var createdAt: Date

    init(id: String = UUID().uuidString, name: String, nodeId: String) {
        self.id = id
        self.name = name
        self.nodeId = nodeId
        self.createdAt = Date()
    }
}
