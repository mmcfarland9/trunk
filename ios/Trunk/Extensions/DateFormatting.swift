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

    /// Format a Date as ISO8601 with fractional seconds (milliseconds), in UTC.
    static func format(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        f.timeZone = TimeZone(identifier: "UTC")
        return f.string(from: date)
    }
}

