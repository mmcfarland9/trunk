//
//  SunPrompts.swift
//  Trunk
//
//  Reflection prompts for the weekly shine feature.
//

import Foundation

enum SunPrompts {
    static let prompts: [String] = [
        "What small wins have you noticed here recently?",
        "How has this area of your life evolved over the past month?",
        "What would nurturing this look like in the coming week?",
        "What's one thing you're grateful for in this area?",
        "What challenge here has taught you something valuable?",
        "If you could change one thing about this area, what would it be?",
        "What does success look like here in six months?",
        "Who has helped you grow in this area?",
        "What habit or practice has served you well here?",
        "What's been on your mind lately regarding this?",
        "What would you tell your past self about this area?",
        "What's the next small step forward here?",
        "How does this area connect to what matters most to you?",
        "What energy have you been bringing to this lately?",
        "What would it feel like to fully show up here?",
        "What's one honest assessment of where you stand?",
        "What seeds have you planted here that haven't sprouted yet?",
        "What deserves more attention in this area?",
        "What can you let go of here to make room for growth?",
        "How has your perspective on this area shifted recently?"
    ]

    /// Get a random prompt, optionally excluding recent ones
    static func randomPrompt(excluding: [String] = []) -> String {
        let available = prompts.filter { !excluding.contains($0) }
        return available.randomElement() ?? prompts.randomElement() ?? prompts[0]
    }
}
