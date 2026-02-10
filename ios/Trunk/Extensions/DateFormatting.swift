//
//  DateFormatting.swift
//  Trunk
//
//  Shared date formatting utilities used across log views and event parsing.
//

import Foundation

// MARK: - ISO8601 Parsing

enum ISO8601 {
    private static let withFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let withoutFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    /// Parse an ISO8601 timestamp string, trying fractional seconds first.
    /// Returns Date.distantPast if both formats fail.
    static func parse(_ timestamp: String) -> Date {
        withFractional.date(from: timestamp)
            ?? withoutFractional.date(from: timestamp)
            ?? Date.distantPast
    }

    /// Format a Date as ISO8601 without fractional seconds, in UTC.
    static func format(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        f.timeZone = TimeZone(identifier: "UTC")
        return f.string(from: date)
    }
}

// MARK: - Log View Formatting

enum LogFormatting {
    private static let dateGroupFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return f
    }()

    static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    /// Group header for log entries: "Today", "Yesterday", or "Jan 5, 2025"
    static func dateGroupKey(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            return dateGroupFormatter.string(from: date)
        }
    }
}
