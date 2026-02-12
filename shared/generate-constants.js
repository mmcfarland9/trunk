#!/usr/bin/env node
/**
 * Unified Constants Generator
 *
 * Generates both TypeScript and Swift constants from shared/constants.json
 *
 * Usage: node shared/generate-constants.js
 * Outputs:
 *   - web/src/generated/constants.ts
 *   - ios/Trunk/Generated/SharedConstants.swift
 */

const fs = require('fs')
const path = require('path')

const constantsPath = path.join(__dirname, 'constants.json')
const tsOutputPath = path.join(__dirname, '../web/src/generated/constants.ts')
const swiftOutputPath = path.join(__dirname, '../ios/Trunk/Generated/SharedConstants.swift')

const constants = JSON.parse(fs.readFileSync(constantsPath, 'utf8'))

// =============================================================================
// TypeScript Generation
// =============================================================================

function generateTypeScript() {
  const plantingCostsEntries = Object.entries(constants.soil.plantingCosts)
    .map(([season, envs]) => {
      const envEntries = Object.entries(envs)
        .map(([env, cost]) => `    ${env}: ${cost}`)
        .join(',\n')
      return `  '${season}': {\n${envEntries}\n  }`
    })
    .join(',\n')

  const environmentMultipliersEntries = Object.entries(constants.soil.environmentMultipliers)
    .map(([env, mult]) => `  ${env}: ${mult}`)
    .join(',\n')

  const resultMultipliersEntries = Object.entries(constants.soil.resultMultipliers)
    .map(([result, mult]) => `  ${result}: ${mult}`)
    .join(',\n')

  const seasonsEntries = Object.entries(constants.seasons)
    .map(([season, data]) => {
      return `  '${season}': {\n    label: '${data.label}',\n    durationMs: ${data.durationMs},\n    baseReward: ${data.baseReward}\n  }`
    })
    .join(',\n')

  const environmentsEntries = Object.entries(constants.environments)
    .map(([env, data]) => {
      return `  ${env}: {\n    label: '${data.label}',\n    description: '${data.description}',\n    formHint: '${data.formHint}'\n  }`
    })
    .join(',\n')

  const resultsEntries = Object.entries(constants.results)
    .map(([result, data]) => {
      return `  ${result}: {\n    label: '${data.label}',\n    description: '${data.description}'\n  }`
    })
    .join(',\n')

  const branchesArray = constants.tree.branches
    .map((b) => {
      const twigsArray = b.twigs.map((t) => `'${t}'`).join(', ')
      return `  {\n    name: '${b.name}',\n    description: '${b.description}',\n    twigs: [${twigsArray}]\n  }`
    })
    .join(',\n')

  const storageKeysEntries = Object.entries(constants.storage.keys)
    .map(([key, value]) => `  ${key}: '${value}'`)
    .join(',\n')

  return `//
// constants.ts
// Generated from shared/constants.json
//
// AUTO-GENERATED - DO NOT EDIT
// Run 'npm run generate' from web/ or 'node shared/generate-constants.js' from repo root
//

// =============================================================================
// Soil Constants
// =============================================================================

export const SOIL_STARTING_CAPACITY = ${constants.soil.startingCapacity}
export const SOIL_MAX_CAPACITY = ${constants.soil.maxCapacity}

export const PLANTING_COSTS = {
${plantingCostsEntries}
} as const

export const ENVIRONMENT_MULTIPLIERS = {
${environmentMultipliersEntries}
} as const

export const RESULT_MULTIPLIERS = {
${resultMultipliersEntries}
} as const

export const SOIL_WATER_RECOVERY = ${constants.soil.recoveryRates.waterUse}
export const SOIL_SUN_RECOVERY = ${constants.soil.recoveryRates.sunUse}

// =============================================================================
// Water Constants
// =============================================================================

export const WATER_DAILY_CAPACITY = ${constants.water.dailyCapacity}
export const WATER_RESET_HOUR = ${constants.water.resetHour}
export const WATER_RESET_INTERVAL_MS = ${constants.water.resetIntervalMs}

// =============================================================================
// Sun Constants
// =============================================================================

export const SUN_WEEKLY_CAPACITY = ${constants.sun.weeklyCapacity}
export const SUN_RESET_HOUR = ${constants.sun.resetHour}
export const SUN_RESET_INTERVAL_MS = ${constants.sun.resetIntervalMs}

// =============================================================================
// Seasons
// =============================================================================

export const SEASONS = {
${seasonsEntries}
} as const

// =============================================================================
// Environments
// =============================================================================

export const ENVIRONMENTS = {
${environmentsEntries}
} as const

// =============================================================================
// Results
// =============================================================================

export const RESULTS = {
${resultsEntries}
} as const

// =============================================================================
// Tree Structure
// =============================================================================

export const BRANCH_COUNT = ${constants.tree.branchCount}
export const TWIG_COUNT = ${constants.tree.twigCount}

export const BRANCHES = [
${branchesArray}
] as const

// =============================================================================
// Storage
// =============================================================================

export const STORAGE_KEYS = {
${storageKeysEntries}
} as const

export const EXPORT_REMINDER_DAYS = ${constants.storage.exportReminderDays}

// =============================================================================
// Chart Bucket Config
// =============================================================================

export type ChartBucketConfig =
  | { intervalSeconds: number }
  | { calendarSnap: 'semimonthly' }
  | { adaptive: true; targetNodes: number }

export const CHART_BUCKETS: Record<string, ChartBucketConfig> = {
${Object.entries(constants.chart.buckets)
  .map(([range, config]) => {
    if (config.intervalSeconds) return `  '${range}': { intervalSeconds: ${config.intervalSeconds} }`
    if (config.calendarSnap) return `  '${range}': { calendarSnap: '${config.calendarSnap}' }`
    return `  '${range}': { adaptive: true, targetNodes: ${config.targetNodes} }`
  })
  .join(',\n')}
}

// =============================================================================
// Watering Prompts
// =============================================================================

export const WATERING_PROMPTS: readonly string[] = [
${constants.wateringPrompts.map((p) => `  '${p.replace(/'/g, "\\'")}'`).join(',\n')}
] as const
`
}

// =============================================================================
// Swift Generation
// =============================================================================

function generateSwift() {
  return `//
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
        static let startingCapacity: Double = ${constants.soil.startingCapacity}
        static let maxCapacity: Double = ${constants.soil.maxCapacity}

        /// Planting costs by season and environment
        static let plantingCosts: [String: [String: Int]] = [
${Object.entries(constants.soil.plantingCosts)
  .map(
    ([season, envs]) =>
      `            "${season}": [${Object.entries(envs)
        .map(([env, cost]) => `"${env}": ${cost}`)
        .join(', ')}]`
  )
  .join(',\n')}
        ]

        /// Environment multipliers for rewards
        static let environmentMultipliers: [String: Double] = [
${Object.entries(constants.soil.environmentMultipliers)
  .map(([env, mult]) => `            "${env}": ${mult}`)
  .join(',\n')}
        ]

        /// Result multipliers (1-5 scale)
        static let resultMultipliers: [Int: Double] = [
${Object.entries(constants.soil.resultMultipliers)
  .map(([result, mult]) => `            ${result}: ${mult}`)
  .join(',\n')}
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
${Object.entries(constants.seasons)
  .map(([season, data]) => `            "${season}": ${data.baseReward}`)
  .join(',\n')}
        ]

        static let durations: [String: Int] = [
${Object.entries(constants.seasons)
  .map(([season, data]) => `            "${season}": ${data.durationMs}`)
  .join(',\n')}
        ]

        static let labels: [String: String] = [
${Object.entries(constants.seasons)
  .map(([season, data]) => `            "${season}": "${data.label}"`)
  .join(',\n')}
        ]
    }

    // MARK: - Environments

    enum Environments {
        static let labels: [String: String] = [
${Object.entries(constants.environments)
  .map(([env, data]) => `            "${env}": "${data.label}"`)
  .join(',\n')}
        ]

        static let descriptions: [String: String] = [
${Object.entries(constants.environments)
  .map(([env, data]) => `            "${env}": "${data.description}"`)
  .join(',\n')}
        ]

        static let formHints: [String: String] = [
${Object.entries(constants.environments)
  .map(([env, data]) => `            "${env}": "${data.formHint}"`)
  .join(',\n')}
        ]
    }

    // MARK: - Results

    enum Results {
        static let labels: [Int: String] = [
${Object.entries(constants.results)
  .map(([result, data]) => `            ${result}: "${data.label}"`)
  .join(',\n')}
        ]

        static let descriptions: [Int: String] = [
${Object.entries(constants.results)
  .map(([result, data]) => `            ${result}: "${data.description}"`)
  .join(',\n')}
        ]
    }

    // MARK: - Tree

    enum Tree {
        static let branchCount: Int = ${constants.tree.branchCount}
        static let twigCount: Int = ${constants.tree.twigCount}

        static let branchNames: [String] = [
${constants.tree.branches.map((b) => `            "${b.name}"`).join(',\n')}
        ]

        static let branchDescriptions: [String] = [
${constants.tree.branches.map((b) => `            "${b.description}"`).join(',\n')}
        ]

        /// Twig labels indexed by [branchIndex][twigIndex]
        static let twigLabels: [[String]] = [
${constants.tree.branches
  .map((b) => `            [${b.twigs.map((t) => `"${t}"`).join(', ')}]`)
  .join(',\n')}
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

    // MARK: - Chart

    enum Chart {
        /// Fixed-interval bucket sizes in seconds, keyed by range ID
        static let fixedIntervalBuckets: [String: Int] = [
${Object.entries(constants.chart.buckets)
  .filter(([, config]) => config.intervalSeconds)
  .map(([range, config]) => `            "${range}": ${config.intervalSeconds}`)
  .join(',\n')}
        ]

        /// Ranges that use calendar-snapped semimonthly bucketing (1st & 15th of each month)
        static let semimonthlyRanges: Set<String> = [${Object.entries(constants.chart.buckets)
  .filter(([, config]) => config.calendarSnap)
  .map(([range]) => `"${range}"`)
  .join(', ')}]

        /// Target node count for adaptive (ALL) range
        static let adaptiveTargetNodes: Int = ${constants.chart.buckets.all.targetNodes}
    }

    // MARK: - Watering Prompts

    enum WateringPrompts {
        static let prompts: [String] = [
${constants.wateringPrompts.map((p) => `            "${p.replace(/"/g, '\\"')}"`).join(',\n')}
        ]
    }
}
`
}

// =============================================================================
// Main
// =============================================================================

function ensureDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function main() {
  // Generate TypeScript
  ensureDir(tsOutputPath)
  const tsContent = generateTypeScript()
  fs.writeFileSync(tsOutputPath, tsContent)
  console.log(`Generated ${tsOutputPath}`)

  // Generate Swift
  ensureDir(swiftOutputPath)
  const swiftContent = generateSwift()
  fs.writeFileSync(swiftOutputPath, swiftContent)
  console.log(`Generated ${swiftOutputPath}`)

  console.log('\nConstants generation complete.')
}

main()
