//
//  SunPrompts.swift
//  Trunk
//
//  Reflection prompts for the weekly shine feature.
//  Generic prompts use {twig} token replaced at runtime with the twig label.
//

import Foundation

enum SunPrompts {
    /// Generic prompts with {twig} token for dynamic replacement
    static let genericPrompts: [String] = [
        // Past orientation
        "What did {twig} teach you recently?",
        "How has {twig} evolved over the past month?",
        "What small wins have you noticed in {twig}?",
        "What challenge in {twig} has taught you something valuable?",
        "What would you tell your past self about {twig}?",
        "How has your perspective on {twig} shifted recently?",
        // Present orientation
        "How does {twig} feel in your life right now?",
        "What energy have you been bringing to {twig} lately?",
        "What's been on your mind lately regarding {twig}?",
        "What's one honest assessment of where you stand with {twig}?",
        "How are you showing up for {twig} these days?",
        // Future orientation
        "What would you like {twig} to become?",
        "What would nurturing {twig} look like in the coming week?",
        "What does success look like for {twig} in six months?",
        "What's the next small step forward in {twig}?",
        "What seeds have you planted in {twig} that haven't sprouted yet?",
        // Timeless orientation
        "Why does {twig} matter to you?",
        "How does {twig} connect to what matters most to you?",
        "What would it feel like to fully show up for {twig}?",
        "What can you let go of in {twig} to make room for growth?",
        "What deserves more attention in {twig}?",
        "What's one thing you're grateful for about {twig}?",
        "Who has helped you grow in {twig}?"
    ]

    /// Get a random prompt with {twig} replaced by the actual twig label
    static func randomPrompt(twigLabel: String, excluding: [String] = []) -> String {
        let available = genericPrompts.filter { !excluding.contains($0) }
        let template = available.randomElement() ?? genericPrompts.randomElement() ?? genericPrompts[0]
        return template.replacingOccurrences(of: "{twig}", with: twigLabel)
    }
}
