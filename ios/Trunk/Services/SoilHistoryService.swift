//
//  SoilHistoryService.swift
//  Trunk
//
//  Service for computing soil history from events and bucketing data for charts.
//

import Foundation

struct RawSoilSnapshot {
    let date: Date
    let capacity: Double
    let available: Double
}

struct SoilChartPoint: Identifiable {
    let id = UUID()
    let date: Date
    let capacity: Double
    let available: Double
}

enum SoilChartRange: String, CaseIterable {
    case oneDay = "1D"
    case oneWeek = "1W"
    case oneMonth = "1M"
    case threeMonths = "3M"
    case sixMonths = "6M"
    case yearToDate = "YTD"
    case inception = "ALL"

    var bucketKey: String {
        switch self {
        case .oneDay: return "1d"
        case .oneWeek: return "1w"
        case .oneMonth: return "1m"
        case .threeMonths: return "3m"
        case .sixMonths: return "6m"
        case .yearToDate: return "ytd"
        case .inception: return "all"
        }
    }

    var startDate: Date? {
        let calendar = Calendar.current
        let now = Date()
        switch self {
        case .oneDay: return calendar.date(byAdding: .day, value: -1, to: now)
        case .oneWeek: return calendar.date(byAdding: .day, value: -7, to: now)
        case .oneMonth: return calendar.date(byAdding: .month, value: -1, to: now)
        case .threeMonths: return calendar.date(byAdding: .month, value: -3, to: now)
        case .sixMonths: return calendar.date(byAdding: .month, value: -6, to: now)
        case .yearToDate:
            return calendar.date(from: calendar.dateComponents([.year], from: now))
        case .inception: return nil
        }
    }
}

struct SoilHistoryService {
    /// Compute raw soil history from events (every state change).
    static func computeSoilHistory() -> [RawSoilSnapshot] {
        let events = EventStore.shared.events
        var capacity = SharedConstants.Soil.startingCapacity
        var available = SharedConstants.Soil.startingCapacity
        var history: [RawSoilSnapshot] = []

        // Track planted sprouts for harvest/uproot reward calculation
        var sproutInfo: [String: (season: String, environment: String, soilCost: Double, isActive: Bool)] = [:]

        // Starting point from first event
        if let firstEvent = events.first {
            let date = parseISO8601(firstEvent.clientTimestamp)
            history.append(RawSoilSnapshot(date: date, capacity: capacity, available: available))
        }

        for event in events {
            let date = parseISO8601(event.clientTimestamp)
            var changed = false

            switch event.type {
            case "sprout_planted":
                if let sproutId = getString(event.payload, "sproutId"),
                   let season = getString(event.payload, "season"),
                   let environment = getString(event.payload, "environment"),
                   let soilCost = getDouble(event.payload, "soilCost") {
                    sproutInfo[sproutId] = (season: season, environment: environment, soilCost: soilCost, isActive: true)
                    available = max(0, available - soilCost)
                    changed = true
                }

            case "sprout_watered":
                // C2: Only recover soil if sprout exists and is active (matches web derive.ts)
                if let sproutId = getString(event.payload, "sproutId"),
                   let info = sproutInfo[sproutId],
                   info.isActive {
                    available = min(available + SharedConstants.Soil.waterRecovery, capacity)
                    changed = true
                }

            case "sprout_harvested":
                if let sproutId = getString(event.payload, "sproutId"),
                   let capacityGained = getDouble(event.payload, "capacityGained"),
                   let info = sproutInfo[sproutId] {
                    // C14: Clamp capacity to maxCapacity (matches web derive.ts)
                    capacity = min(capacity + capacityGained, SharedConstants.Soil.maxCapacity)
                    let returnedSoil = info.soilCost
                    available = min(available + returnedSoil, capacity)
                    sproutInfo[sproutId] = (season: info.season, environment: info.environment, soilCost: info.soilCost, isActive: false)
                    changed = true
                }

            case "sprout_uprooted":
                if let sproutId = getString(event.payload, "sproutId"),
                   let soilReturned = getDouble(event.payload, "soilReturned") {
                    available = min(available + soilReturned, capacity)
                    if let info = sproutInfo[sproutId] {
                        sproutInfo[sproutId] = (season: info.season, environment: info.environment, soilCost: info.soilCost, isActive: false)
                    }
                    changed = true
                }

            case "sun_shone":
                available = min(available + SharedConstants.Soil.sunRecovery, capacity)
                changed = true

            default:
                break
            }

            if changed {
                history.append(RawSoilSnapshot(date: date, capacity: capacity, available: available))
            }
        }

        // Add current date as final point
        history.append(RawSoilSnapshot(date: Date(), capacity: capacity, available: available))

        return history
    }

    /// Bucket raw history into chart points based on selected range.
    static func bucketSoilHistory(
        _ rawHistory: [RawSoilSnapshot],
        range: SoilChartRange,
        now: Date
    ) -> [SoilChartPoint] {
        guard !rawHistory.isEmpty else { return [] }

        let calendar = Calendar.current
        let rangeStart = range.startDate ?? rawHistory[0].date
        let rangeEnd = now

        // Generate bucket boundaries based on the range's bucket strategy
        let boundaries: [Date]
        let bucketKey = range.bucketKey

        if let intervalSeconds = SharedConstants.Chart.fixedIntervalBuckets[bucketKey] {
            // Fixed interval: floor start to appropriate unit, then step by interval
            let flooredStart: Date
            if intervalSeconds <= 21600 {
                // 1d (3600s) and 1w (21600s): floor to hour
                flooredStart = calendar.dateInterval(of: .hour, for: rangeStart)?.start ?? rangeStart
            } else {
                // 1m (86400s) and 3m (604800s): floor to midnight
                flooredStart = calendar.startOfDay(for: rangeStart)
            }

            let interval = TimeInterval(intervalSeconds)
            var dates: [Date] = []
            var cursor = flooredStart
            while cursor <= rangeEnd {
                dates.append(cursor)
                cursor = cursor.addingTimeInterval(interval)
            }
            // Always include rangeEnd as final boundary (matches web behavior)
            if dates.last != rangeEnd {
                dates.append(rangeEnd)
            }
            boundaries = dates

        } else if SharedConstants.Chart.semimonthlyRanges.contains(bucketKey) {
            // Semimonthly: 1st and 15th of each month
            var dates: [Date] = []
            var components = calendar.dateComponents([.year, .month], from: rangeStart)
            components.hour = 0
            components.minute = 0
            components.second = 0

            while true {
                // 1st of the month
                components.day = 1
                if let first = calendar.date(from: components) {
                    if first >= rangeStart && first <= rangeEnd {
                        dates.append(first)
                    }
                }

                // 15th of the month
                components.day = 15
                if let fifteenth = calendar.date(from: components) {
                    if fifteenth >= rangeStart && fifteenth <= rangeEnd {
                        dates.append(fifteenth)
                    }
                    if fifteenth > rangeEnd { break }
                }

                // Advance to next month
                if let nextMonth = calendar.date(byAdding: .month, value: 1, to: calendar.date(from: components) ?? rangeEnd) {
                    components = calendar.dateComponents([.year, .month], from: nextMonth)
                    components.hour = 0
                    components.minute = 0
                    components.second = 0
                } else {
                    break
                }
            }
            // Always include rangeEnd as final boundary (matches web behavior)
            if dates.last != rangeEnd {
                dates.append(rangeEnd)
            }
            boundaries = dates

        } else {
            // Adaptive (ALL): uniform spacing targeting adaptiveTargetNodes points
            let totalSpan = rangeEnd.timeIntervalSince(rangeStart)
            let targetNodes = Double(SharedConstants.Chart.adaptiveTargetNodes)
            var intervalSeconds = totalSpan / targetNodes

            // If span < 1 day, fall back to hourly
            if totalSpan < 86400 {
                intervalSeconds = 3600
            }

            var dates: [Date] = []
            var cursor = rangeStart
            while cursor <= rangeEnd {
                dates.append(cursor)
                cursor = cursor.addingTimeInterval(intervalSeconds)
            }
            // Always include rangeEnd as final boundary (matches web behavior)
            if dates.last != rangeEnd {
                dates.append(rangeEnd)
            }
            boundaries = dates
        }

        guard !boundaries.isEmpty else { return [] }

        let startingCapacity = SharedConstants.Soil.startingCapacity

        // For each bucket boundary, find the last raw snapshot with date <= boundary
        var result: [SoilChartPoint] = []
        for boundary in boundaries {
            let snapshot = rawHistory.last { $0.date <= boundary }
            let cap = snapshot?.capacity ?? startingCapacity
            let avail = snapshot?.available ?? startingCapacity
            result.append(SoilChartPoint(date: boundary, capacity: cap, available: avail))
        }

        return result
    }

    private static func parseISO8601(_ timestamp: String) -> Date {
        ISO8601.parse(timestamp)
    }
}
