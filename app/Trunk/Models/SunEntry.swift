//
//  SunEntry.swift
//  Trunk
//
//  SwiftData model for sun/shine reflections.
//

import Foundation
import SwiftData

@Model
final class SunEntry {
    var id: String
    var timestamp: Date
    var content: String
    var prompt: String?
    var contextType: String      // "twig" or "leaf"
    var contextNodeId: String?   // twig ID if contextType == "twig"
    var contextLeafId: String?   // leaf ID if contextType == "leaf"
    var contextLabel: String     // display label at time of entry

    init(
        id: String = UUID().uuidString,
        content: String,
        prompt: String? = nil,
        contextType: String,
        contextNodeId: String? = nil,
        contextLeafId: String? = nil,
        contextLabel: String
    ) {
        self.id = id
        self.timestamp = Date()
        self.content = content
        self.prompt = prompt
        self.contextType = contextType
        self.contextNodeId = contextNodeId
        self.contextLeafId = contextLeafId
        self.contextLabel = contextLabel
    }
}
