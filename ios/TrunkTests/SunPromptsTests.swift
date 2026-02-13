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
        let prompt = SharedConstants.SunPrompts.randomPrompt(twigId: "branch-0-twig-0", twigLabel: "Movement")

        // Prompt should not contain {twig} placeholder
        #expect(!prompt.contains("{twig}"))
    }

    @Test("randomPrompt excludes previous prompts")
    func randomPrompt_excludesPrevious() {
        let firstPrompt = SharedConstants.SunPrompts.randomPrompt(twigId: "branch-0-twig-0", twigLabel: "Test")
        var gotDifferent = false

        // Try several times to get a different prompt
        for _ in 0..<20 {
            let nextPrompt = SharedConstants.SunPrompts.randomPrompt(
                twigId: "branch-0-twig-0",
                twigLabel: "Test",
                excluding: [firstPrompt]
            )
            if nextPrompt != firstPrompt {
                gotDifferent = true
                break
            }
        }

        // Should eventually get a different prompt
        #expect(gotDifferent == true)
    }

    @Test("randomPrompt returns something when all excluded")
    func randomPrompt_fallsBackToGeneric() {
        // Exclude a huge list of prompts
        let manyExclusions: Set<String> = Set((0..<100).map { "Fake prompt \($0)" })

        // Should still return something
        let prompt = SharedConstants.SunPrompts.randomPrompt(
            twigId: "branch-0-twig-0",
            twigLabel: "Test",
            excluding: manyExclusions
        )

        #expect(!prompt.isEmpty)
    }

    @Test("randomPrompt handles empty twig label")
    func randomPrompt_emptyLabel() {
        let prompt = SharedConstants.SunPrompts.randomPrompt(twigId: "branch-0-twig-0", twigLabel: "")

        // Should still return a prompt
        #expect(!prompt.isEmpty)
    }

    @Test("randomPrompt handles special characters in label")
    func randomPrompt_specialCharacters() {
        let prompt = SharedConstants.SunPrompts.randomPrompt(twigId: "branch-0-twig-0", twigLabel: "Test & <More>")

        // Should not crash and should return something
        #expect(!prompt.isEmpty)
    }

    @Test("randomPrompt uses specific prompts for known twig IDs")
    func randomPrompt_usesSpecificPrompts() {
        // branch-0-twig-0 has specific prompts, verify we get prompts
        var prompts: Set<String> = []
        for _ in 0..<50 {
            let prompt = SharedConstants.SunPrompts.randomPrompt(twigId: "branch-0-twig-0", twigLabel: "Movement")
            prompts.insert(prompt)
        }

        // Should get multiple different prompts
        #expect(prompts.count > 1)
    }

    @Test("randomPrompt works for unknown twig IDs")
    func randomPrompt_unknownTwigId() {
        let prompt = SharedConstants.SunPrompts.randomPrompt(twigId: "branch-99-twig-99", twigLabel: "Unknown")

        // Should return a generic prompt
        #expect(!prompt.isEmpty)
        #expect(!prompt.contains("{twig}"))
    }
}
