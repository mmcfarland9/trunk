//
//  NodeData.swift
//  Trunk
//
//  Data for a node in the tree (trunk, branch, or twig).
//

import Foundation
import SwiftData

@Model
final class NodeData {
    @Attribute(.unique) var nodeId: String
    var label: String
    var note: String

    init(nodeId: String, label: String = "", note: String = "") {
        self.nodeId = nodeId
        self.label = label
        self.note = note
    }
}
