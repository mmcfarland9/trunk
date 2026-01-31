//
//  SunEntry.swift
//  Trunk
//
//  SwiftData model for sun/shine reflections.
//  Sun only shines on twigs (not leaves or sprouts).
//

import Foundation
import SwiftData

@Model
final class SunEntry {
    var id: String
    var timestamp: Date
    var content: String
    var prompt: String?
    var twigId: String
    var twigLabel: String

    init(
        id: String = UUID().uuidString,
        content: String,
        prompt: String? = nil,
        twigId: String,
        twigLabel: String
    ) {
        self.id = id
        self.timestamp = Date()
        self.content = content
        self.prompt = prompt
        self.twigId = twigId
        self.twigLabel = twigLabel
    }
}
