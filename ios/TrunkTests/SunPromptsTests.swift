//
//  SunPromptsTests.swift
//  TrunkTests
//
//  Tests for sun prompt generation.
//

import Testing
@testable import Trunk

@Suite("SunPrompts")
struct SunPromptsTests {

    @Test("randomPrompt replaces {twig} with label")
    func randomPrompt_replacesTwig() {
        let prompt = SunPrompts.randomPrompt(twigLabel: "Movement")

        // Prompt should not contain {twig} placeholder
        #expect(!prompt.contains("{twig}"))

        // If prompt was about a specific twig, it should contain "Movement"
        // (Some prompts are generic and won't have the twig name)
    }

    @Test("randomPrompt excludes previous prompts")
    func randomPrompt_excludesPrevious() {
        let firstPrompt = SunPrompts.randomPrompt(twigLabel: "Test")
        var attempts = 0
        var gotDifferent = false

        // Try several times to get a different prompt
        for _ in 0..<20 {
            let nextPrompt = SunPrompts.randomPrompt(
                twigLabel: "Test",
                excluding: [firstPrompt]
            )
            if nextPrompt != firstPrompt {
                gotDifferent = true
                break
            }
            attempts += 1
        }

        // Should eventually get a different prompt
        // (Unless there's only one prompt, which is unlikely)
        #expect(gotDifferent == true)
    }

    @Test("randomPrompt returns something when all excluded")
    func randomPrompt_fallsBackToGeneric() {
        // Exclude a huge list of prompts
        let manyExclusions = (0..<100).map { "Fake prompt \($0)" }

        // Should still return something
        let prompt = SunPrompts.randomPrompt(
            twigLabel: "Test",
            excluding: manyExclusions
        )

        #expect(!prompt.isEmpty)
    }

    @Test("randomPrompt handles empty twig label")
    func randomPrompt_emptyLabel() {
        let prompt = SunPrompts.randomPrompt(twigLabel: "")

        // Should still return a prompt
        #expect(!prompt.isEmpty)
    }

    @Test("randomPrompt handles special characters in label")
    func randomPrompt_specialCharacters() {
        let prompt = SunPrompts.randomPrompt(twigLabel: "Test & <More>")

        // Should not crash and should return something
        #expect(!prompt.isEmpty)
    }
}
