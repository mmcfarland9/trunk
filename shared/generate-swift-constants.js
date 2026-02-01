#!/usr/bin/env node
/**
 * Generates SharedConstants.swift from constants.json
 *
 * Usage: node generate-swift-constants.js
 * Output: ../ios/Trunk/Generated/SharedConstants.swift
 */

const fs = require('fs');
const path = require('path');

const constantsPath = path.join(__dirname, 'constants.json');
const outputPath = path.join(__dirname, '../ios/Trunk/Generated/SharedConstants.swift');

const constants = JSON.parse(fs.readFileSync(constantsPath, 'utf8'));

const swift = `//
//  SharedConstants.swift
//  Trunk
//
//  AUTO-GENERATED from shared/constants.json
//  DO NOT EDIT DIRECTLY - run 'node shared/generate-swift-constants.js'
//

import Foundation

// MARK: - Shared Constants

enum SharedConstants {

    // MARK: - Soil

    enum Soil {
        static let startingCapacity: Double = ${constants.soil.startingCapacity}
        static let maxCapacity: Double = ${constants.soil.maxCapacity}

        /// Planting costs by season and environment
        static let plantingCosts: [String: [String: Int]] = [
${Object.entries(constants.soil.plantingCosts).map(([season, envs]) =>
    `            "${season}": [${Object.entries(envs).map(([env, cost]) => `"${env}": ${cost}`).join(', ')}]`
).join(',\n')}
        ]

        /// Environment multipliers for rewards
        static let environmentMultipliers: [String: Double] = [
${Object.entries(constants.soil.environmentMultipliers).map(([env, mult]) =>
    `            "${env}": ${mult}`
).join(',\n')}
        ]

        /// Result multipliers (1-5 scale)
        static let resultMultipliers: [Int: Double] = [
${Object.entries(constants.soil.resultMultipliers).map(([result, mult]) =>
    `            ${result}: ${mult}`
).join(',\n')}
        ]

        /// Recovery rates
        static let waterRecovery: Double = ${constants.soil.recoveryRates.waterUse}
        static let sunRecovery: Double = ${constants.soil.recoveryRates.sunUse}
    }

    // MARK: - Water

    enum Water {
        static let dailyCapacity: Int = ${constants.water.dailyCapacity}
        static let resetHour: Int = ${constants.water.resetHour}
    }

    // MARK: - Sun

    enum Sun {
        static let weeklyCapacity: Int = ${constants.sun.weeklyCapacity}
        static let resetHour: Int = ${constants.sun.resetHour}
    }

    // MARK: - Seasons

    enum Seasons {
        static let baseRewards: [String: Double] = [
${Object.entries(constants.seasons).map(([season, data]) =>
    `            "${season}": ${data.baseReward}`
).join(',\n')}
        ]

        static let durations: [String: Int] = [
${Object.entries(constants.seasons).map(([season, data]) =>
    `            "${season}": ${data.durationMs}`
).join(',\n')}
        ]

        static let labels: [String: String] = [
${Object.entries(constants.seasons).map(([season, data]) =>
    `            "${season}": "${data.label}"`
).join(',\n')}
        ]
    }

    // MARK: - Environments

    enum Environments {
        static let labels: [String: String] = [
${Object.entries(constants.environments).map(([env, data]) =>
    `            "${env}": "${data.label}"`
).join(',\n')}
        ]

        static let descriptions: [String: String] = [
${Object.entries(constants.environments).map(([env, data]) =>
    `            "${env}": "${data.description}"`
).join(',\n')}
        ]

        static let formHints: [String: String] = [
${Object.entries(constants.environments).map(([env, data]) =>
    `            "${env}": "${data.formHint}"`
).join(',\n')}
        ]
    }

    // MARK: - Results

    enum Results {
        static let labels: [Int: String] = [
${Object.entries(constants.results).map(([result, data]) =>
    `            ${result}: "${data.label}"`
).join(',\n')}
        ]

        static let descriptions: [Int: String] = [
${Object.entries(constants.results).map(([result, data]) =>
    `            ${result}: "${data.description}"`
).join(',\n')}
        ]
    }

    // MARK: - Tree

    enum Tree {
        static let branchCount: Int = ${constants.tree.branchCount}
        static let twigCount: Int = ${constants.tree.twigCount}

        static let branchNames: [String] = [
${constants.tree.branches.map(b => `            "${b.name}"`).join(',\n')}
        ]

        static let branchDescriptions: [String] = [
${constants.tree.branches.map(b => `            "${b.description}"`).join(',\n')}
        ]

        /// Twig labels indexed by [branchIndex][twigIndex]
        static let twigLabels: [[String]] = [
${constants.tree.branches.map(b =>
    `            [${b.twigs.map(t => `"${t}"`).join(', ')}]`
).join(',\n')}
        ]

        /// Get twig label for a given branch and twig index
        static func twigLabel(branchIndex: Int, twigIndex: Int) -> String {
            guard branchIndex >= 0, branchIndex < twigLabels.count,
                  twigIndex >= 0, twigIndex < twigLabels[branchIndex].count else {
                return "Twig \\(twigIndex + 1)"
            }
            return twigLabels[branchIndex][twigIndex]
        }

        /// Get branch name for a given index
        static func branchName(_ index: Int) -> String {
            guard index >= 0, index < branchNames.count else {
                return "Branch \\(index + 1)"
            }
            return branchNames[index]
        }
    }
}
`;

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, swift);
console.log(`Generated ${outputPath}`);
