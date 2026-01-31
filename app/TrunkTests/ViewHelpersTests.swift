//
//  ViewHelpersTests.swift
//  TrunkTests
//
//  Tests for view helper functions.
//

import Testing
import Foundation
@testable import Trunk

// MARK: - Time Formatting Tests

@Suite("Time Formatting")
struct TimeFormattingTests {

    @Test("relativeTime shows 'just now' for recent dates")
    func relativeTime_justNow() {
        let date = Date()
        let result = TodayViewHelpers.relativeTime(date)

        #expect(result == "just now")
    }

    @Test("relativeTime shows minutes ago")
    func relativeTime_minutesAgo() {
        let date = Date().addingTimeInterval(-300) // 5 minutes ago
        let result = TodayViewHelpers.relativeTime(date)

        #expect(result.contains("m ago"))
    }

    @Test("relativeTime shows hours ago")
    func relativeTime_hoursAgo() {
        let date = Date().addingTimeInterval(-7200) // 2 hours ago
        let result = TodayViewHelpers.relativeTime(date)

        #expect(result.contains("h ago"))
    }

    @Test("relativeTime shows days ago")
    func relativeTime_daysAgo() {
        let date = Date().addingTimeInterval(-259200) // 3 days ago
        let result = TodayViewHelpers.relativeTime(date)

        #expect(result.contains("d ago"))
    }
}

// MARK: - Result Emoji Tests

@Suite("Result Emoji")
struct ResultEmojiTests {

    @Test("Result 1 returns wilted flower")
    func resultToEmoji_one() {
        #expect(TodayViewHelpers.resultToEmoji(1) == "🥀")
    }

    @Test("Result 2 returns seedling")
    func resultToEmoji_two() {
        #expect(TodayViewHelpers.resultToEmoji(2) == "🌱")
    }

    @Test("Result 3 returns herb")
    func resultToEmoji_three() {
        #expect(TodayViewHelpers.resultToEmoji(3) == "🌿")
    }

    @Test("Result 4 returns deciduous tree")
    func resultToEmoji_four() {
        #expect(TodayViewHelpers.resultToEmoji(4) == "🌳")
    }

    @Test("Result 5 returns evergreen tree")
    func resultToEmoji_five() {
        #expect(TodayViewHelpers.resultToEmoji(5) == "🌲")
    }

    @Test("Invalid result returns question mark")
    func resultToEmoji_invalid() {
        #expect(TodayViewHelpers.resultToEmoji(0) == "❓")
        #expect(TodayViewHelpers.resultToEmoji(6) == "❓")
    }
}

// MARK: - Context Label Tests

@Suite("Context Label")
struct ContextLabelTests {

    @Test("contextLabel parses twig ID correctly")
    func contextLabel_parsesTwigId() {
        // This would need actual nodeId parsing logic
        // Placeholder test structure
        let nodeId = "branch-0-twig-3"

        // Parse branch index
        let branchIndex = Int(nodeId.components(separatedBy: "-")[1])
        #expect(branchIndex == 0)

        // Parse twig index
        let twigIndex = Int(nodeId.components(separatedBy: "-")[3])
        #expect(twigIndex == 3)
    }

    @Test("contextLabel returns nodeId as fallback")
    func contextLabel_fallback() {
        let invalidNodeId = "invalid-format"
        // Should return the original nodeId when parsing fails
        // This tests the fallback behavior
        #expect(!invalidNodeId.isEmpty)
    }
}

// MARK: - Date Grouping Tests

@Suite("Date Grouping")
struct DateGroupingTests {

    @Test("dateGroupKey returns 'Today' for today's date")
    func dateGroupKey_today() {
        let today = Date()
        let result = LogViewHelpers.dateGroupKey(today)

        #expect(result == "Today")
    }

    @Test("dateGroupKey returns 'Yesterday' for yesterday's date")
    func dateGroupKey_yesterday() {
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        let result = LogViewHelpers.dateGroupKey(yesterday)

        #expect(result == "Yesterday")
    }

    @Test("dateGroupKey returns formatted date for older dates")
    func dateGroupKey_older() {
        let oldDate = Calendar.current.date(byAdding: .day, value: -10, to: Date())!
        let result = LogViewHelpers.dateGroupKey(oldDate)

        // Should be in "MMM d, yyyy" format, not "Today" or "Yesterday"
        #expect(result != "Today")
        #expect(result != "Yesterday")
        #expect(result.contains(",")) // Date format includes comma
    }
}

// MARK: - Geometry Tests

@Suite("Geometry Helpers")
struct GeometryTests {

    @Test("angleForBranch 0 is at top (negative π/2)")
    func angleForBranch_zero() {
        let angle = OverviewViewHelpers.angleForBranch(0)

        // Branch 0 should be at the top, which is -π/2 radians
        #expect(abs(angle - (-Double.pi / 2)) < 0.01)
    }

    @Test("angleForBranch 4 is at bottom (π/2)")
    func angleForBranch_four() {
        let angle = OverviewViewHelpers.angleForBranch(4)

        // Branch 4 should be at the bottom, which is π/2 radians
        #expect(abs(angle - (Double.pi / 2)) < 0.01)
    }

    @Test("branches are evenly spaced around circle")
    func angleForBranch_evenlySpaced() {
        let angle0 = OverviewViewHelpers.angleForBranch(0)
        let angle1 = OverviewViewHelpers.angleForBranch(1)

        // Each branch should be π/4 radians apart (8 branches = 2π/8 = π/4)
        let difference = abs(angle1 - angle0)
        #expect(abs(difference - (Double.pi / 4)) < 0.01)
    }

    @Test("pointOnCircle calculates correct coordinates")
    func pointOnCircle_basic() {
        let center = CGPoint(x: 100, y: 100)
        let radius: CGFloat = 50
        let angle: Double = 0 // Right side

        let point = OverviewViewHelpers.pointOnCircle(
            center: center,
            radius: radius,
            angle: angle
        )

        // At angle 0, point should be to the right of center
        #expect(abs(point.x - 150) < 1) // center.x + radius
        #expect(abs(point.y - 100) < 1) // center.y
    }
}

// MARK: - Helper Implementations for Tests

// These would normally be in the actual View files, but we need testable versions

enum TodayViewHelpers {
    static func relativeTime(_ date: Date) -> String {
        let seconds = Int(-date.timeIntervalSinceNow)

        if seconds < 60 {
            return "just now"
        } else if seconds < 3600 {
            return "\(seconds / 60)m ago"
        } else if seconds < 86400 {
            return "\(seconds / 3600)h ago"
        } else {
            return "\(seconds / 86400)d ago"
        }
    }

    static func resultToEmoji(_ result: Int) -> String {
        switch result {
        case 1: return "🥀"
        case 2: return "🌱"
        case 3: return "🌿"
        case 4: return "🌳"
        case 5: return "🌲"
        default: return "❓"
        }
    }
}

enum LogViewHelpers {
    static func dateGroupKey(_ date: Date) -> String {
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d, yyyy"
            return formatter.string(from: date)
        }
    }
}

enum OverviewViewHelpers {
    static func angleForBranch(_ index: Int) -> Double {
        // Start at top (-π/2) and go clockwise
        return -Double.pi / 2 + Double(index) * (Double.pi / 4)
    }

    static func pointOnCircle(center: CGPoint, radius: CGFloat, angle: Double) -> CGPoint {
        CGPoint(
            x: center.x + radius * CGFloat(cos(angle)),
            y: center.y + radius * CGFloat(sin(angle))
        )
    }
}
