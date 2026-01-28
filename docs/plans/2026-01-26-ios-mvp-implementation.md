# iOS MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build native iOS app for Trunk with full sprout lifecycle (view tree, create/plant/water/harvest sprouts) and complete progression system matching web app.

**Architecture:** SwiftUI + SwiftData (iOS 17+) with MVVM architecture. Build-time code generation from shared/constants.json ensures cross-platform consistency. Native navigation patterns (NavigationStack, sheets).

**Tech Stack:** Swift 5.9+, SwiftUI, SwiftData, iOS 17.0+, Xcode 15+

---

## Overview

This plan implements the iOS MVP in 4 phases:
1. **Foundation** - Xcode project, models, code generation
2. **Navigation** - Tree navigation UI (overview → branch → twig)
3. **Sprout Management** - Create, plant, water, harvest sprouts
4. **Progression System** - Soil/water/sun mechanics with formulas

---

## Task 1: Create Xcode Project

**Files:**
- Create: `app/Trunk.xcodeproj/`
- Create: `app/Trunk/TrunkApp.swift`
- Create: `app/Trunk/ContentView.swift`

**Step 1: Create new Xcode project**

1. Open Xcode
2. File → New → Project
3. Choose "iOS" → "App"
4. Product Name: "Trunk"
5. Team: (your team)
6. Organization Identifier: com.yourname
7. Interface: SwiftUI
8. Storage: SwiftData
9. Language: Swift
10. Save location: `/Users/michaelmcfarland/dev/html/trunk/app/`

Expected: Xcode creates project with TrunkApp.swift and ContentView.swift

**Step 2: Set minimum iOS version**

1. Select project in navigator
2. Select "Trunk" target
3. General → Deployment Info → iOS Deployment Target: 17.0

Expected: Minimum iOS version set to 17.0

**Step 3: Create folder structure**

In Xcode navigator, create groups:
- Models
- ViewModels
- Views
  - Dialogs
- Services
- Resources
  - Generated

Expected: Folder structure matches planned architecture

**Step 4: Build and run**

Run: Cmd+R
Expected: App runs in simulator showing "Hello, world!"

**Step 5: Commit initial project**

```bash
cd app
git add .
git commit -m "chore: create Xcode project for iOS app

- iOS 17.0+ deployment target
- SwiftUI + SwiftData
- Basic folder structure"
```

Expected: Initial commit created

---

## Task 2: Create SwiftData Models

**Files:**
- Create: `app/Trunk/Models/Sprout.swift`
- Create: `app/Trunk/Models/WaterEntry.swift`
- Create: `app/Trunk/Models/Leaf.swift`
- Create: `app/Trunk/Models/NodeData.swift`

**Step 1: Create Sprout model**

Create `app/Trunk/Models/Sprout.swift`:

```swift
import Foundation
import SwiftData

@Model
final class Sprout {
    @Attribute(.unique) var id: String
    var title: String
    var season: String // "2w", "1m", "3m", "6m", "1y"
    var environment: String // "fertile", "firm", "barren"
    var state: String // "draft", "active", "completed", "failed"
    var soilCost: Double
    var result: Int? // 1-5 when harvested
    var leafId: String?

    // Timestamps
    var createdAt: Date
    var plantedAt: Date?
    var harvestedAt: Date?

    // Bloom descriptions
    var bloom1: String?
    var bloom3: String?
    var bloom5: String?

    // Relationships
    var nodeId: String // Which twig owns this sprout
    @Relationship(deleteRule: .cascade) var waterEntries: [WaterEntry]

    init(
        id: String,
        title: String,
        season: String,
        environment: String,
        state: String,
        soilCost: Double,
        nodeId: String,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.season = season
        self.environment = environment
        self.state = state
        self.soilCost = soilCost
        self.nodeId = nodeId
        self.createdAt = createdAt
        self.waterEntries = []
    }
}
```

**Step 2: Create WaterEntry model**

Create `app/Trunk/Models/WaterEntry.swift`:

```swift
import Foundation
import SwiftData

@Model
final class WaterEntry {
    var timestamp: Date
    var note: String?

    init(timestamp: Date, note: String? = nil) {
        self.timestamp = timestamp
        self.note = note
    }
}
```

**Step 3: Create Leaf model**

Create `app/Trunk/Models/Leaf.swift`:

```swift
import Foundation
import SwiftData

@Model
final class Leaf {
    @Attribute(.unique) var id: String
    var name: String
    var createdAt: Date
    var nodeId: String // Which twig owns this leaf

    init(id: String, name: String, nodeId: String, createdAt: Date = Date()) {
        self.id = id
        self.name = name
        self.nodeId = nodeId
        self.createdAt = createdAt
    }
}
```

**Step 4: Create NodeData model**

Create `app/Trunk/Models/NodeData.swift`:

```swift
import Foundation
import SwiftData

@Model
final class NodeData {
    @Attribute(.unique) var nodeId: String
    var label: String
    var note: String

    init(nodeId: String, label: String, note: String = "") {
        self.nodeId = nodeId
        self.label = label
        self.note = note
    }
}
```

**Step 5: Update TrunkApp with model container**

Modify `app/Trunk/TrunkApp.swift`:

```swift
import SwiftUI
import SwiftData

@main
struct TrunkApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self])
    }
}
```

**Step 6: Build to verify**

Run: Cmd+B
Expected: Build succeeds with no errors

**Step 7: Commit models**

```bash
git add app/Trunk/Models/ app/Trunk/TrunkApp.swift
git commit -m "feat: add SwiftData models

- Sprout with all properties matching schema
- WaterEntry for watering journal
- Leaf for saga tracking
- NodeData for trunk/branch/twig labels"
```

Expected: Commit created

---

## Task 3: Build-Time Code Generation

**Files:**
- Create: `scripts/generate-constants.swift`
- Create: `app/Trunk/Resources/Generated/Constants.swift` (generated)
- Modify: Xcode build phases

**Step 1: Create generation script**

Create `scripts/generate-constants.swift`:

```swift
#!/usr/bin/env swift

import Foundation

// Parse command line args for project root
let projectRoot = CommandLine.arguments.count > 1
    ? URL(fileURLWithPath: CommandLine.arguments[1])
    : URL(fileURLWithPath: FileManager.default.currentDirectoryPath)

// Read shared/constants.json
let constantsURL = projectRoot
    .appendingPathComponent("shared")
    .appendingPathComponent("constants.json")

guard let data = try? Data(contentsOf: constantsURL),
      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
    print("❌ Failed to read shared/constants.json")
    exit(1)
}

// Helper to extract nested values
func getDouble(_ dict: [String: Any], _ key: String) -> Double {
    dict[key] as? Double ?? 0
}

func getInt(_ dict: [String: Any], _ key: String) -> Int {
    dict[key] as? Int ?? 0
}

func getString(_ dict: [String: Any], _ key: String) -> String {
    dict[key] as? String ?? ""
}

// Extract nested dictionaries
let soil = json["soil"] as! [String: Any]
let water = json["water"] as! [String: Any]
let sun = json["sun"] as! [String: Any]
let tree = json["tree"] as! [String: Any]

// Build output
var output = """
// Generated from shared/constants.json
// DO NOT EDIT - Changes will be overwritten
// Generated at: \(Date())

import Foundation

struct Constants {
    struct Soil {
        static let startingCapacity: Double = \(getDouble(soil, "startingCapacity"))
        static let maxCapacity: Double = \(getDouble(soil, "maxCapacity"))
        static let recoveryPerWater: Double = \(getDouble(soil, "recoveryPerWater"))
        static let recoveryPerSun: Double = \(getDouble(soil, "recoveryPerSun"))
    }

    struct Water {
        static let dailyCapacity: Int = \(getInt(water, "dailyCapacity"))
        static let resetHour: Int = \(getInt(water, "resetHour"))
    }

    struct Sun {
        static let weeklyCapacity: Int = \(getInt(sun, "weeklyCapacity"))
        static let resetHour: Int = \(getInt(sun, "resetHour"))
    }

    struct Tree {
        static let branchCount: Int = \(getInt(tree, "branchCount"))
        static let twigCount: Int = \(getInt(tree, "twigCount"))
    }

    // Season data
    struct Season {
        let label: String
        let durationDays: Int
        let baseCost: Double
        let baseReward: Double
    }

    static let seasons: [String: Season] = [

"""

// Generate seasons
if let seasons = json["seasons"] as? [String: [String: Any]] {
    for (key, value) in seasons.sorted(by: { $0.key < $1.key }) {
        output += """
        "\(key)": Season(
            label: "\(getString(value, "label"))",
            durationDays: \(getInt(value, "durationDays")),
            baseCost: \(getDouble(value, "baseCost")),
            baseReward: \(getDouble(value, "baseReward"))
        ),

"""
    }
}

output += """
    ]

    // Environment data
    struct Environment {
        let label: String
        let costMultiplier: Double
        let rewardMultiplier: Double
    }

    static let environments: [String: Environment] = [

"""

// Generate environments
if let environments = json["environments"] as? [String: [String: Any]] {
    for (key, value) in environments.sorted(by: { $0.key < $1.key }) {
        output += """
        "\(key)": Environment(
            label: "\(getString(value, "label"))",
            costMultiplier: \(getDouble(value, "costMultiplier")),
            rewardMultiplier: \(getDouble(value, "rewardMultiplier"))
        ),

"""
    }
}

output += """
    ]

    // Result multipliers
    static let resultMultipliers: [Int: Double] = [

"""

// Generate results
if let results = json["results"] as? [String: [String: Any]] {
    for (key, value) in results.sorted(by: { Int($0.key)! < Int($1.key)! }) {
        output += """
        \(key): \(getDouble(value, "multiplier")),

"""
    }
}

output += """
    ]
}

"""

// Write to output file
let outputURL = projectRoot
    .appendingPathComponent("app/Trunk/Resources/Generated/Constants.swift")

// Create directory if needed
try? FileManager.default.createDirectory(
    at: outputURL.deletingLastPathComponent(),
    withIntermediateDirectories: true
)

do {
    try output.write(to: outputURL, atomically: true, encoding: .utf8)
    print("✓ Generated Constants.swift")
} catch {
    print("❌ Failed to write Constants.swift: \(error)")
    exit(1)
}
```

**Step 2: Make script executable**

Run:
```bash
chmod +x scripts/generate-constants.swift
```

Expected: Script is executable

**Step 3: Test generation script**

Run:
```bash
cd /Users/michaelmcfarland/dev/html/trunk
./scripts/generate-constants.swift "$PWD"
```

Expected: "✓ Generated Constants.swift" and file created in app/Trunk/Resources/Generated/

**Step 4: Add to Xcode**

1. Drag `app/Trunk/Resources/Generated/Constants.swift` into Xcode navigator
2. Uncheck "Copy items if needed" (it's already there)
3. Add to Trunk target

Expected: Constants.swift appears in Xcode

**Step 5: Add build phase**

1. Select project → Target "Trunk" → Build Phases
2. Click "+" → New Run Script Phase
3. Name: "Generate Constants"
4. Move it BEFORE "Compile Sources"
5. Script:
```bash
cd "$SRCROOT/.."
./scripts/generate-constants.swift "$SRCROOT/.."
```

Expected: Build phase added

**Step 6: Build to verify**

Run: Cmd+B
Expected: Build succeeds, Constants.swift regenerated

**Step 7: Commit code generation**

```bash
git add scripts/generate-constants.swift app/Trunk/Resources/Generated/
git commit -m "feat: add build-time code generation from shared constants

Script reads shared/constants.json and generates Swift constants.
Runs automatically before compilation to stay in sync."
```

Expected: Commit created

---

## Task 4: Create ProgressionService

**Files:**
- Create: `app/Trunk/Services/ProgressionService.swift`
- Create: `app/TrunkTests/ProgressionServiceTests.swift`

**Step 1: Write failing test**

Create `app/TrunkTests/ProgressionServiceTests.swift`:

```swift
import XCTest
@testable import Trunk

final class ProgressionServiceTests: XCTestCase {
    var service: ProgressionService!

    override func setUp() {
        super.setUp()
        service = ProgressionService()
    }

    // Test from shared/formulas.md
    func testSoilCostCalculation() {
        let cost = service.calculateSoilCost(season: "3m", environment: "firm")
        XCTAssertEqual(cost, 8.0, "3m firm should cost 8 soil (5 × 1.5 = 7.5, rounded up)")
    }

    func testCapacityReward() {
        let reward = service.calculateCapacityReward(
            season: "3m",
            environment: "firm",
            result: 4,
            currentCapacity: 50
        )
        XCTAssertEqual(reward, 3.18, accuracy: 0.01, "Should match web formula exactly")
    }

    func testSoilRecoveryRates() {
        XCTAssertEqual(service.soilRecoveryPerWater(), 0.05)
        XCTAssertEqual(service.soilRecoveryPerSun(), 0.35)
    }
}
```

**Step 2: Run test to verify it fails**

Run: Cmd+U (or Product → Test)
Expected: Tests fail with "Use of unresolved identifier 'ProgressionService'"

**Step 3: Create ProgressionService**

Create `app/Trunk/Services/ProgressionService.swift`:

```swift
import Foundation

final class ProgressionService {
    func calculateSoilCost(season: String, environment: String) -> Double {
        guard let seasonData = Constants.seasons[season],
              let envData = Constants.environments[environment] else {
            return 0
        }

        let base = seasonData.baseCost
        let multiplier = envData.costMultiplier
        return ceil(base * multiplier)
    }

    func calculateCapacityReward(
        season: String,
        environment: String,
        result: Int,
        currentCapacity: Double
    ) -> Double {
        guard let seasonData = Constants.seasons[season],
              let envData = Constants.environments[environment],
              let resultMult = Constants.resultMultipliers[result] else {
            return 0
        }

        let baseReward = seasonData.baseReward
        let envMult = envData.rewardMultiplier

        // Diminishing returns with ^1.5 exponent (from formulas.md)
        let maxCapacity = Constants.Soil.maxCapacity
        let diminishingFactor = max(0, pow(1 - (currentCapacity / maxCapacity), 1.5))

        return baseReward * envMult * resultMult * diminishingFactor
    }

    func soilRecoveryPerWater() -> Double {
        Constants.Soil.recoveryPerWater
    }

    func soilRecoveryPerSun() -> Double {
        Constants.Soil.recoveryPerSun
    }
}
```

**Step 4: Run tests to verify they pass**

Run: Cmd+U
Expected: All 3 tests pass

**Step 5: Commit ProgressionService**

```bash
git add app/Trunk/Services/ProgressionService.swift app/TrunkTests/ProgressionServiceTests.swift
git commit -m "feat: add ProgressionService with formula implementations

Implements soil cost and capacity reward formulas from shared/formulas.md.
Tests verify cross-platform consistency with web app."
```

Expected: Commit created

---

## Task 5: Create ResourceState and ProgressionViewModel

**Files:**
- Create: `app/Trunk/Models/ResourceState.swift`
- Create: `app/Trunk/ViewModels/ProgressionViewModel.swift`

**Step 1: Create ResourceState**

Create `app/Trunk/Models/ResourceState.swift`:

```swift
import Foundation

struct ResourceState: Codable {
    var soilAvailable: Double
    var soilCapacity: Double
    var waterLastReset: Date
    var sunLastReset: Date
    var debugClockOffset: Int // Days offset for testing

    static var `default`: ResourceState {
        ResourceState(
            soilAvailable: Constants.Soil.startingCapacity,
            soilCapacity: Constants.Soil.startingCapacity,
            waterLastReset: Date(),
            sunLastReset: Date(),
            debugClockOffset: 0
        )
    }

    // UserDefaults persistence
    private static let key = "trunk-resource-state"

    static func load() -> ResourceState {
        guard let data = UserDefaults.standard.data(forKey: key),
              let state = try? JSONDecoder().decode(ResourceState.self, from: data) else {
            return .default
        }
        return state
    }

    func save() {
        if let data = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(data, forKey: Self.key)
        }
    }
}
```

**Step 2: Create ProgressionViewModel**

Create `app/Trunk/ViewModels/ProgressionViewModel.swift`:

```swift
import Foundation
import Observation

enum ProgressionError: Error {
    case insufficientSoil
    case insufficientWater
}

@Observable
final class ProgressionViewModel {
    private let service = ProgressionService()

    var resourceState: ResourceState {
        didSet {
            resourceState.save()
        }
    }

    init() {
        self.resourceState = ResourceState.load()
    }

    // Computed properties
    var soilAvailable: Double { resourceState.soilAvailable }
    var soilCapacity: Double { resourceState.soilCapacity }

    // Water availability (simplified for MVP - just check if reset happened)
    var waterAvailable: Int {
        let calendar = Calendar.current
        let lastReset = calendar.startOfDay(for: resourceState.waterLastReset)
        let now = calendar.startOfDay(for: currentDate)

        if now > lastReset {
            // Reset happened
            return Constants.Water.dailyCapacity
        }
        // TODO: Track actual water usage
        return 0
    }

    private var currentDate: Date {
        Calendar.current.date(
            byAdding: .day,
            value: resourceState.debugClockOffset,
            to: Date()
        ) ?? Date()
    }

    // MARK: - Actions

    func plantSprout(_ sprout: Sprout) throws {
        let cost = service.calculateSoilCost(season: sprout.season, environment: sprout.environment)

        guard resourceState.soilAvailable >= cost else {
            throw ProgressionError.insufficientSoil
        }

        resourceState.soilAvailable -= cost
        sprout.state = "active"
        sprout.plantedAt = currentDate
        sprout.soilCost = cost
    }

    func harvestSprout(_ sprout: Sprout, result: Int) {
        let reward = service.calculateCapacityReward(
            season: sprout.season,
            environment: sprout.environment,
            result: result,
            currentCapacity: resourceState.soilCapacity
        )

        // Return spent soil
        resourceState.soilAvailable += sprout.soilCost

        // Add capacity reward
        resourceState.soilCapacity += reward

        sprout.state = "completed"
        sprout.result = result
        sprout.harvestedAt = currentDate
    }

    func waterSprout(_ sprout: Sprout, note: String?) throws {
        guard waterAvailable > 0 else {
            throw ProgressionError.insufficientWater
        }

        let entry = WaterEntry(timestamp: currentDate, note: note)
        sprout.waterEntries.append(entry)

        // Add soil recovery
        resourceState.soilAvailable += service.soilRecoveryPerWater()

        // Mark water as used (simplified - just update last reset)
        resourceState.waterLastReset = currentDate
    }
}
```

**Step 3: Build to verify**

Run: Cmd+B
Expected: Build succeeds

**Step 4: Commit view model**

```bash
git add app/Trunk/Models/ResourceState.swift app/Trunk/ViewModels/ProgressionViewModel.swift
git commit -m "feat: add ResourceState and ProgressionViewModel

- ResourceState persists to UserDefaults
- ProgressionViewModel manages soil/water/sun state
- Implements plant, harvest, and water actions"
```

Expected: Commit created

---

## Task 6: Build OverviewView (Tree Visualization)

**Files:**
- Create: `app/Trunk/Views/OverviewView.swift`
- Modify: `app/Trunk/ContentView.swift`

**Step 1: Create OverviewView**

Create `app/Trunk/Views/OverviewView.swift`:

```swift
import SwiftUI
import SwiftData

struct OverviewView: View {
    @Environment(ProgressionViewModel.self) private var progression
    @Query private var allSprouts: [Sprout]

    var body: some View {
        VStack(spacing: 0) {
            // Resource meters
            ResourceMetersView()
                .padding()

            Spacer()

            // Tree visualization
            ZStack {
                // Trunk in center
                Button {
                    // Trunk tap - could open settings
                } label: {
                    Circle()
                        .fill(Color.brown)
                        .frame(width: 60, height: 60)
                        .overlay {
                            Text("🌳")
                                .font(.largeTitle)
                        }
                }

                // 8 branches in circle
                ForEach(0..<Constants.Tree.branchCount, id: \.self) { index in
                    NavigationLink {
                        BranchView(branchIndex: index)
                    } label: {
                        BranchButton(index: index)
                    }
                    .offset(x: xOffset(index), y: yOffset(index))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Spacer()

            // Active sprouts list
            if !activeSprouts.isEmpty {
                ActiveSproutsSection(sprouts: activeSprouts)
                    .padding()
            }
        }
        .navigationTitle("Trunk")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("Settings") { }
                    Button("Export Data") { }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
    }

    private var activeSprouts: [Sprout] {
        allSprouts.filter { $0.state == "active" }
    }

    private func xOffset(_ index: Int) -> CGFloat {
        let angle = Double(index) * .pi / 4 // 45° apart (8 branches)
        return cos(angle) * 120
    }

    private func yOffset(_ index: Int) -> CGFloat {
        let angle = Double(index) * .pi / 4
        return sin(angle) * 120
    }
}

struct BranchButton: View {
    let index: Int

    var body: some View {
        Circle()
            .fill(Color.green.opacity(0.3))
            .frame(width: 50, height: 50)
            .overlay {
                Text("\(index + 1)")
                    .font(.headline)
                    .foregroundStyle(.primary)
            }
    }
}

struct ResourceMetersView: View {
    @Environment(ProgressionViewModel.self) private var progression

    var body: some View {
        HStack(spacing: 16) {
            // Soil meter
            VStack(alignment: .leading, spacing: 4) {
                Text("Soil")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))

                        Rectangle()
                            .fill(Color.brown)
                            .frame(width: geo.size.width * (progression.soilAvailable / progression.soilCapacity))
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                .frame(height: 8)

                Text("\(progression.soilAvailable, specifier: "%.1f") / \(progression.soilCapacity, specifier: "%.1f")")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            // Water circles
            VStack(alignment: .leading, spacing: 4) {
                Text("Water")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                HStack(spacing: 4) {
                    ForEach(0..<Constants.Water.dailyCapacity, id: \.self) { index in
                        Circle()
                            .fill(index < progression.waterAvailable ? Color.blue : Color.gray.opacity(0.2))
                            .frame(width: 12, height: 12)
                    }
                }

                Text("\(progression.waterAvailable)/\(Constants.Water.dailyCapacity)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct ActiveSproutsSection: View {
    let sprouts: [Sprout]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Growing (\(sprouts.count))")
                .font(.headline)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(sprouts) { sprout in
                        SproutCard(sprout: sprout)
                    }
                }
            }
        }
    }
}

struct SproutCard: View {
    let sprout: Sprout

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(sprout.title)
                .font(.caption)
                .lineLimit(2)

            Text(sprout.season)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(8)
        .frame(width: 100)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

#Preview {
    NavigationStack {
        OverviewView()
            .environment(ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self], inMemory: true)
}
```

**Step 2: Update ContentView**

Modify `app/Trunk/ContentView.swift`:

```swift
import SwiftUI

struct ContentView: View {
    @State private var progressionVM = ProgressionViewModel()

    var body: some View {
        NavigationStack {
            OverviewView()
                .environment(progressionVM)
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [Sprout.self], inMemory: true)
}
```

**Step 3: Build and run**

Run: Cmd+R
Expected: App shows tree with 8 branches in circle, trunk in center, resource meters at top

**Step 4: Commit OverviewView**

```bash
git add app/Trunk/Views/OverviewView.swift app/Trunk/ContentView.swift
git commit -m "feat: add OverviewView with tree visualization

- 8 branches in circular layout
- Trunk button in center
- Resource meters (soil, water)
- Active sprouts section"
```

Expected: Commit created

---

## Task 7: Build BranchView (8 Twigs)

**Files:**
- Create: `app/Trunk/Views/BranchView.swift`

**Step 1: Create BranchView**

Create `app/Trunk/Views/BranchView.swift`:

```swift
import SwiftUI
import SwiftData

struct BranchView: View {
    let branchIndex: Int

    @Query private var allSprouts: [Sprout]
    @State private var selectedTwig: Int?

    var body: some View {
        List {
            ForEach(0..<Constants.Tree.twigCount, id: \.self) { twigIndex in
                TwigRow(
                    branchIndex: branchIndex,
                    twigIndex: twigIndex,
                    sprouts: twigSprouts(twigIndex)
                )
            }
        }
        .navigationTitle("Branch \(branchIndex + 1)")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func twigSprouts(_ twigIndex: Int) -> [Sprout] {
        let nodeId = "branch-\(branchIndex)-twig-\(twigIndex)"
        return allSprouts.filter { $0.nodeId == nodeId }
    }
}

struct TwigRow: View {
    let branchIndex: Int
    let twigIndex: Int
    let sprouts: [Sprout]

    @State private var showingDetail = false

    var body: some View {
        Button {
            showingDetail = true
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Twig \(twigIndex + 1)")
                        .font(.headline)

                    if !sprouts.isEmpty {
                        Text("\(activeSprouts.count) growing, \(completedSprouts.count) harvested")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                if !sprouts.isEmpty {
                    Text("\(sprouts.count)")
                        .font(.caption)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green)
                        .clipShape(Capsule())
                }

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .sheet(isPresented: $showingDetail) {
            TwigDetailView(branchIndex: branchIndex, twigIndex: twigIndex)
        }
    }

    private var activeSprouts: [Sprout] {
        sprouts.filter { $0.state == "active" }
    }

    private var completedSprouts: [Sprout] {
        sprouts.filter { $0.state == "completed" }
    }
}

#Preview {
    NavigationStack {
        BranchView(branchIndex: 0)
    }
    .modelContainer(for: [Sprout.self], inMemory: true)
}
```

**Step 2: Build and run**

Run: Cmd+R
Expected: Tapping a branch shows list of 8 twigs

**Step 3: Commit BranchView**

```bash
git add app/Trunk/Views/BranchView.swift
git commit -m "feat: add BranchView with twig list

Shows 8 twigs with sprout counts. Tapping opens TwigDetailView."
```

Expected: Commit created

---

## Task 8: Build TwigDetailView (Sprout Management)

**Files:**
- Create: `app/Trunk/Views/TwigDetailView.swift`

**Step 1: Create TwigDetailView**

Create `app/Trunk/Views/TwigDetailView.swift`:

```swift
import SwiftUI
import SwiftData

struct TwigDetailView: View {
    let branchIndex: Int
    let twigIndex: Int

    @Environment(\.modelContext) private var modelContext
    @Environment(ProgressionViewModel.self) private var progression
    @Environment(\.dismiss) private var dismiss

    @Query private var allSprouts: [Sprout]
    @State private var showingCreateSprout = false

    var body: some View {
        NavigationStack {
            List {
                // Draft sprouts
                if !draftSprouts.isEmpty {
                    Section("Drafts") {
                        ForEach(draftSprouts) { sprout in
                            SproutRow(sprout: sprout)
                        }
                    }
                }

                // Active sprouts
                if !activeSprouts.isEmpty {
                    Section("Growing") {
                        ForEach(activeSprouts) { sprout in
                            SproutRow(sprout: sprout)
                        }
                    }
                }

                // Completed sprouts
                if !completedSprouts.isEmpty {
                    Section("Harvested") {
                        ForEach(completedSprouts) { sprout in
                            SproutRow(sprout: sprout)
                        }
                    }
                }

                // Empty state
                if twigSprouts.isEmpty {
                    Section {
                        Text("No sprouts yet")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding()
                    }
                }
            }
            .navigationTitle("Twig \(twigIndex + 1)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingCreateSprout = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingCreateSprout) {
                CreateSproutView(nodeId: nodeId)
            }
        }
    }

    private var nodeId: String {
        "branch-\(branchIndex)-twig-\(twigIndex)"
    }

    private var twigSprouts: [Sprout] {
        allSprouts.filter { $0.nodeId == nodeId }
    }

    private var draftSprouts: [Sprout] {
        twigSprouts.filter { $0.state == "draft" }
    }

    private var activeSprouts: [Sprout] {
        twigSprouts.filter { $0.state == "active" }
    }

    private var completedSprouts: [Sprout] {
        twigSprouts.filter { $0.state == "completed" }
    }
}

struct SproutRow: View {
    let sprout: Sprout
    @State private var showingActions = false

    var body: some View {
        Button {
            showingActions = true
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(sprout.title)
                        .font(.headline)

                    HStack(spacing: 8) {
                        Text(seasonLabel)
                        Text("•")
                        Text(environmentLabel)
                        if let result = sprout.result {
                            Text("•")
                            Text("\(result)/5")
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                stateIndicator
            }
        }
        .sheet(isPresented: $showingActions) {
            SproutActionsView(sprout: sprout)
        }
    }

    private var seasonLabel: String {
        Constants.seasons[sprout.season]?.label ?? sprout.season
    }

    private var environmentLabel: String {
        Constants.environments[sprout.environment]?.label ?? sprout.environment
    }

    @ViewBuilder
    private var stateIndicator: some View {
        switch sprout.state {
        case "draft":
            Image(systemName: "doc.text")
                .foregroundStyle(.secondary)
        case "active":
            Image(systemName: "leaf.fill")
                .foregroundStyle(.green)
        case "completed":
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
        case "failed":
            Image(systemName: "xmark.circle.fill")
                .foregroundStyle(.red)
        default:
            EmptyView()
        }
    }
}

#Preview {
    TwigDetailView(branchIndex: 0, twigIndex: 0)
        .environment(ProgressionViewModel())
        .modelContainer(for: [Sprout.self], inMemory: true)
}
```

**Step 2: Build and run**

Run: Cmd+R
Expected: Twig detail shows empty state or sprout lists. Plus button ready for next task.

**Step 3: Commit TwigDetailView**

```bash
git add app/Trunk/Views/TwigDetailView.swift
git commit -m "feat: add TwigDetailView for sprout management

Shows sprouts grouped by state (drafts, growing, harvested).
Plus button to create new sprouts."
```

Expected: Commit created

---

## Task 9: Build CreateSproutView (Form)

**Files:**
- Create: `app/Trunk/Views/Dialogs/CreateSproutView.swift`

**Step 1: Create CreateSproutView**

Create `app/Trunk/Views/Dialogs/CreateSproutView.swift`:

```swift
import SwiftUI
import SwiftData

struct CreateSproutView: View {
    let nodeId: String

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Environment(ProgressionViewModel.self) private var progression

    @State private var title = ""
    @State private var season = "1m"
    @State private var environment = "fertile"
    @State private var bloom1 = ""
    @State private var bloom3 = ""
    @State private var bloom5 = ""
    @State private var showingError = false

    private let service = ProgressionService()

    var body: some View {
        NavigationStack {
            Form {
                Section("Goal") {
                    TextField("What are you cultivating?", text: $title)
                }

                Section("Duration") {
                    Picker("Season", selection: $season) {
                        ForEach(["2w", "1m", "3m", "6m", "1y"], id: \.self) { key in
                            Text(Constants.seasons[key]?.label ?? key).tag(key)
                        }
                    }
                    .pickerStyle(.menu)
                }

                Section("Difficulty") {
                    Picker("Environment", selection: $environment) {
                        Text("🌱 Fertile (easy)").tag("fertile")
                        Text("🪨 Firm (stretch)").tag("firm")
                        Text("🏜️ Barren (hard)").tag("barren")
                    }
                    .pickerStyle(.menu)
                }

                Section("Success Criteria (Optional)") {
                    TextField("1/5 outcome (showing up)", text: $bloom1)
                    TextField("3/5 outcome (solid work)", text: $bloom3)
                    TextField("5/5 outcome (exceeded goals)", text: $bloom5)
                }

                Section {
                    HStack {
                        Text("Soil Cost")
                        Spacer()
                        Text("\(soilCost, specifier: "%.0f")")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("New Sprout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }

                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button("Save as Draft") { saveDraft() }
                            .disabled(title.isEmpty)

                        Button("Plant Now") { plantSprout() }
                            .disabled(title.isEmpty || !canAfford)
                    } label: {
                        Text("Save")
                    }
                }
            }
            .alert("Insufficient Soil", isPresented: $showingError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("You need \(soilCost, specifier: "%.0f") soil but only have \(progression.soilAvailable, specifier: "%.1f") available.")
            }
        }
    }

    private var soilCost: Double {
        service.calculateSoilCost(season: season, environment: environment)
    }

    private var canAfford: Bool {
        progression.soilAvailable >= soilCost
    }

    private func saveDraft() {
        let sprout = createSprout(state: "draft")
        modelContext.insert(sprout)
        dismiss()
    }

    private func plantSprout() {
        let sprout = createSprout(state: "draft")
        modelContext.insert(sprout)

        do {
            try progression.plantSprout(sprout)
            dismiss()
        } catch {
            showingError = true
        }
    }

    private func createSprout(state: String) -> Sprout {
        let sprout = Sprout(
            id: UUID().uuidString,
            title: title,
            season: season,
            environment: environment,
            state: state,
            soilCost: soilCost,
            nodeId: nodeId
        )

        if !bloom1.isEmpty { sprout.bloom1 = bloom1 }
        if !bloom3.isEmpty { sprout.bloom3 = bloom3 }
        if !bloom5.isEmpty { sprout.bloom5 = bloom5 }

        return sprout
    }
}

#Preview {
    CreateSproutView(nodeId: "branch-0-twig-0")
        .environment(ProgressionViewModel())
        .modelContainer(for: [Sprout.self], inMemory: true)
}
```

**Step 2: Build and run**

Run: Cmd+R
Expected: Plus button opens form to create sprouts. Can save as draft or plant.

**Step 3: Test creating a sprout**

1. Tap a branch → tap a twig → tap +
2. Enter title "Test Goal"
3. Select season and environment
4. Tap Save → Plant Now
5. Should see sprout in "Growing" section
6. Soil meter should decrease

Expected: Sprout created and planted successfully

**Step 4: Commit CreateSproutView**

```bash
git add app/Trunk/Views/Dialogs/CreateSproutView.swift
git commit -m "feat: add CreateSproutView for sprout creation

Form with title, season, environment, bloom descriptions.
Can save as draft or plant immediately."
```

Expected: Commit created

---

## Task 10: Build SproutActionsView (Water & Harvest)

**Files:**
- Create: `app/Trunk/Views/Dialogs/SproutActionsView.swift`
- Create: `app/Trunk/Views/Dialogs/WaterSproutView.swift`
- Create: `app/Trunk/Views/Dialogs/HarvestSproutView.swift`

**Step 1: Create SproutActionsView**

Create `app/Trunk/Views/Dialogs/SproutActionsView.swift`:

```swift
import SwiftUI

struct SproutActionsView: View {
    let sprout: Sprout

    @Environment(\.dismiss) private var dismiss
    @Environment(ProgressionViewModel.self) private var progression

    @State private var showingWater = false
    @State private var showingHarvest = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(sprout.title)
                            .font(.title3)
                            .bold()

                        HStack(spacing: 8) {
                            Text(seasonLabel)
                            Text("•")
                            Text(environmentLabel)
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 8)
                }

                if sprout.state == "draft" {
                    Section {
                        Button("Plant Sprout") {
                            plantSprout()
                        }
                        .disabled(!canAfford)

                        if !canAfford {
                            Text("Insufficient soil (\(soilCost, specifier: "%.0f") needed)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                if sprout.state == "active" {
                    Section {
                        Button {
                            showingWater = true
                        } label: {
                            Label("Water (+0.05 soil)", systemImage: "drop.fill")
                        }
                        .disabled(progression.waterAvailable == 0)

                        Button {
                            showingHarvest = true
                        } label: {
                            Label("Harvest", systemImage: "checkmark.circle")
                        }
                    }
                }

                // Water history
                if !sprout.waterEntries.isEmpty {
                    Section("Water History") {
                        ForEach(sprout.waterEntries.sorted(by: { $0.timestamp > $1.timestamp })) { entry in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(entry.timestamp, style: .date)
                                    .font(.caption)

                                if let note = entry.note {
                                    Text(note)
                                        .font(.subheadline)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Sprout Actions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showingWater) {
                WaterSproutView(sprout: sprout)
            }
            .sheet(isPresented: $showingHarvest) {
                HarvestSproutView(sprout: sprout)
            }
        }
    }

    private var soilCost: Double {
        ProgressionService().calculateSoilCost(season: sprout.season, environment: sprout.environment)
    }

    private var canAfford: Bool {
        progression.soilAvailable >= soilCost
    }

    private var seasonLabel: String {
        Constants.seasons[sprout.season]?.label ?? sprout.season
    }

    private var environmentLabel: String {
        Constants.environments[sprout.environment]?.label ?? sprout.environment
    }

    private func plantSprout() {
        try? progression.plantSprout(sprout)
        dismiss()
    }
}
```

**Step 2: Create WaterSproutView**

Create `app/Trunk/Views/Dialogs/WaterSproutView.swift`:

```swift
import SwiftUI

struct WaterSproutView: View {
    let sprout: Sprout

    @Environment(\.dismiss) private var dismiss
    @Environment(ProgressionViewModel.self) private var progression

    @State private var note = ""
    @State private var showingError = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Image(systemName: "drop.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(.blue)

                    Text("Water \(sprout.title)")
                        .font(.title2)
                        .bold()

                    Text("Share a brief reflection on your progress")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 40)

                TextEditor(text: $note)
                    .frame(height: 120)
                    .padding(8)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .padding(.horizontal)

                Spacer()

                Button {
                    waterSprout()
                } label: {
                    Text("Water (+0.05 soil)")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding()
                .disabled(progression.waterAvailable == 0)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("No Water Available", isPresented: $showingError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("Water resets daily at 6:00 AM.")
            }
        }
    }

    private func waterSprout() {
        do {
            try progression.waterSprout(sprout, note: note.isEmpty ? nil : note)
            dismiss()
        } catch {
            showingError = true
        }
    }
}
```

**Step 3: Create HarvestSproutView**

Create `app/Trunk/Views/Dialogs/HarvestSproutView.swift`:

```swift
import SwiftUI

struct HarvestSproutView: View {
    let sprout: Sprout

    @Environment(\.dismiss) private var dismiss
    @Environment(ProgressionViewModel.self) private var progression

    @State private var selectedResult = 3

    private let service = ProgressionService()

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text("Harvest \(sprout.title)")
                    .font(.title2)
                    .bold()
                    .padding(.top, 40)

                Text("How did it go?")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Picker("Result", selection: $selectedResult) {
                    ForEach(1...5, id: \.self) { result in
                        Text("\(result)/5").tag(result)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                // Show relevant bloom description
                if let bloom = bloomForResult(selectedResult) {
                    Text(bloom)
                        .font(.callout)
                        .padding()
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .padding(.horizontal)
                }

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Soil returned")
                        Spacer()
                        Text("+\(sprout.soilCost, specifier: "%.1f")")
                            .foregroundStyle(.green)
                    }

                    HStack {
                        Text("Capacity reward")
                        Spacer()
                        Text("+\(capacityReward, specifier: "%.2f")")
                            .foregroundStyle(.green)
                            .bold()
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .padding(.horizontal)

                Spacer()

                Button {
                    harvestSprout()
                } label: {
                    Text("Harvest")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private var capacityReward: Double {
        service.calculateCapacityReward(
            season: sprout.season,
            environment: sprout.environment,
            result: selectedResult,
            currentCapacity: progression.soilCapacity
        )
    }

    private func bloomForResult(_ result: Int) -> String? {
        if result <= 2 { return sprout.bloom1 }
        if result <= 4 { return sprout.bloom3 }
        return sprout.bloom5
    }

    private func harvestSprout() {
        progression.harvestSprout(sprout, result: selectedResult)
        dismiss()
    }
}
```

**Step 4: Build and run**

Run: Cmd+R
Expected: Can water active sprouts and harvest them with result rating

**Step 5: Test full lifecycle**

1. Create a new sprout and plant it
2. Tap the sprout → Water
3. Enter a note and water it (soil increases by 0.05)
4. Tap sprout again → Harvest
5. Select result rating
6. Harvest (soil returned + capacity reward)

Expected: Full lifecycle works, progression matches formulas

**Step 6: Commit sprout actions**

```bash
git add app/Trunk/Views/Dialogs/
git commit -m "feat: add water and harvest dialogs

- WaterSproutView with journal entry
- HarvestSproutView with result rating
- SproutActionsView coordinates actions
- Full sprout lifecycle functional"
```

Expected: Commit created

---

## Verification & Polish

**Final Steps:**

1. **Run all tests**: Cmd+U
2. **Verify formulas match web**: Check test results
3. **Test on device**: Run on physical iPhone if available
4. **Verify resource meters update correctly**
5. **Test edge cases**: Insufficient soil, no water, etc.

**Success Criteria:**

- ✓ Tree navigation works (Overview → Branch → Twig)
- ✓ Can create sprouts (draft and plant)
- ✓ Can water sprouts (with journal)
- ✓ Can harvest sprouts (with ratings)
- ✓ Soil progression matches web formulas exactly
- ✓ Resource meters update correctly
- ✓ All tests pass

---

## Next Steps (Post-MVP)

Features deferred to v2:
- Sun system (weekly reflection)
- Leaf sagas (grouping related sprouts)
- Import/export (JSON backup)
- Settings (notifications, name customization)
- Node labels/notes (customize trunk/branch/twig names)
- Dark mode support
- Accessibility improvements

---

## Development Timeline

**Estimated effort:** ~3-4 days for experienced iOS developer

- **Day 1**: Tasks 1-5 (Project setup, models, code generation, services)
- **Day 2**: Tasks 6-7 (Navigation UI)
- **Day 3**: Tasks 8-9 (Sprout management, creation)
- **Day 4**: Task 10 + testing (Water/harvest, verification)

**Prerequisites:**
- Xcode 15+
- macOS Sonoma or later
- iOS 17+ device or simulator
- Swift experience
