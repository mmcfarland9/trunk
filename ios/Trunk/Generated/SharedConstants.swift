//
//  SharedConstants.swift
//  Trunk
//
//  AUTO-GENERATED from shared/constants.json
//  DO NOT EDIT DIRECTLY - run 'node shared/generate-constants.js'
//

import Foundation

// MARK: - Shared Constants

enum SharedConstants {

    // MARK: - Soil

    enum Soil {
        static let startingCapacity: Double = 10
        static let maxCapacity: Double = 120

        /// Planting costs by season and environment
        static let plantingCosts: [String: [String: Int]] = [
            "2w": ["fertile": 2, "firm": 3, "barren": 4],
            "1m": ["fertile": 3, "firm": 5, "barren": 6],
            "3m": ["fertile": 5, "firm": 8, "barren": 10],
            "6m": ["fertile": 8, "firm": 12, "barren": 16],
            "1y": ["fertile": 12, "firm": 18, "barren": 24]
        ]

        /// Environment multipliers for rewards
        static let environmentMultipliers: [String: Double] = [
            "fertile": 1.1,
            "firm": 1.75,
            "barren": 2.4
        ]

        /// Result multipliers (1-5 scale)
        static let resultMultipliers: [Int: Double] = [
            1: 0.4,
            2: 0.55,
            3: 0.7,
            4: 0.85,
            5: 1
        ]

        /// Recovery rates
        static let waterRecovery: Double = 0.05
        static let sunRecovery: Double = 0.35
    }

    // MARK: - Water

    enum Water {
        static let dailyCapacity: Int = 3
        static let resetHour: Int = 6
    }

    // MARK: - Sun

    enum Sun {
        static let weeklyCapacity: Int = 1
        static let resetHour: Int = 6
    }

    // MARK: - Seasons

    enum Seasons {
        static let baseRewards: [String: Double] = [
            "2w": 0.26,
            "1m": 0.56,
            "3m": 1.95,
            "6m": 4.16,
            "1y": 8.84
        ]

        static let durations: [String: Int] = [
            "2w": 1209600000,
            "1m": 2592000000,
            "3m": 7776000000,
            "6m": 15552000000,
            "1y": 31536000000
        ]

        static let labels: [String: String] = [
            "2w": "2 weeks",
            "1m": "1 month",
            "3m": "3 months",
            "6m": "6 months",
            "1y": "1 year"
        ]
    }

    // MARK: - Environments

    enum Environments {
        static let labels: [String: String] = [
            "fertile": "Fertile",
            "firm": "Firm",
            "barren": "Barren"
        ]

        static let descriptions: [String: String] = [
            "fertile": "Easy to achieve",
            "firm": "Challenging stretch",
            "barren": "Very difficult"
        ]

        static let formHints: [String: String] = [
            "fertile": "[Comfortable terrain · no soil bonus]",
            "firm": "[New obstacles · +1 soil capacity]",
            "barren": "[Hostile conditions · +2 soil capacity]"
        ]
    }

    // MARK: - Results

    enum Results {
        static let labels: [Int: String] = [
            1: "Minimal",
            2: "Partial",
            3: "Good",
            4: "Strong",
            5: "Exceptional"
        ]

        static let descriptions: [Int: String] = [
            1: "Showed up but little progress",
            2: "Made some progress",
            3: "Met most expectations",
            4: "Exceeded expectations",
            5: "Fully achieved and then some"
        ]
    }

    // MARK: - Tree

    enum Tree {
        static let branchCount: Int = 8
        static let twigCount: Int = 8

        static let branchNames: [String] = [
            "CORE",
            "BRAIN",
            "VOICE",
            "HANDS",
            "HEART",
            "BREATH",
            "BACK",
            "FEET"
        ]

        static let branchDescriptions: [String] = [
            "fitness & vitality",
            "knowledge & curiosity",
            "expression & creativity",
            "making & craft",
            "love & family",
            "regulation & renewal",
            "belonging & community",
            "stability & direction"
        ]

        /// Twig labels indexed by [branchIndex][twigIndex]
        static let twigLabels: [[String]] = [
            ["movement", "strength", "sport", "technique", "maintenance", "nutrition", "sleep", "appearance"],
            ["reading", "writing", "reasoning", "focus", "memory", "analysis", "dialogue", "exploration"],
            ["practice", "composition", "interpretation", "performance", "consumption", "curation", "completion", "publication"],
            ["design", "fabrication", "assembly", "repair", "refinement", "tooling", "tending", "preparation"],
            ["homemaking", "care", "presence", "intimacy", "communication", "ritual", "adventure", "joy"],
            ["observation", "nature", "flow", "repose", "idleness", "exposure", "abstinence", "reflection"],
            ["connection", "support", "gathering", "membership", "stewardship", "advocacy", "service", "culture"],
            ["work", "development", "positioning", "ventures", "finance", "operations", "planning", "administration"]
        ]

        /// Get twig label for a given branch and twig index
        static func twigLabel(branchIndex: Int, twigIndex: Int) -> String {
            guard branchIndex >= 0, branchIndex < twigLabels.count,
                  twigIndex >= 0, twigIndex < twigLabels[branchIndex].count else {
                return "Twig \(twigIndex + 1)"
            }
            return twigLabels[branchIndex][twigIndex]
        }

        /// Get branch name for a given index
        static func branchName(_ index: Int) -> String {
            guard index >= 0, index < branchNames.count else {
                return "Branch \(index + 1)"
            }
            return branchNames[index]
        }
    }

    // MARK: - Chart

    enum Chart {
        /// Fixed-interval bucket sizes in seconds, keyed by range ID
        static let fixedIntervalBuckets: [String: Int] = [
            "1d": 3600,
            "1w": 21600,
            "1m": 86400,
            "3m": 604800
        ]

        /// Ranges that use calendar-snapped semimonthly bucketing (1st & 15th of each month)
        static let semimonthlyRanges: Set<String> = ["6m", "ytd"]

        /// Target node count for adaptive (ALL) range
        static let adaptiveTargetNodes: Int = 24
    }

    // MARK: - Watering Prompts

    enum WateringPrompts {
        static let prompts: [String] = [
            "How do you feel about this today?",
            "What did you actually do today?",
            "Where's your energy with this right now?",
            "What blocked you today?",
            "What tiny step did you take?",
            "What's the single next step?",
            "Are you avoiding something?",
            "What's working in your approach?",
            "What do you need to keep going?",
            "Are you still committed to this?",
            "What moment stands out from today?",
            "What part still excites you?",
            "What went right today?",
            "What would make this feel easier?",
            "What resistance showed up?",
            "Should you try something different?",
            "What would you do if no one was watching?",
            "Why did you start this?"
        ]
    }
}
