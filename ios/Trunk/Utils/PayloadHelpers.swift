//
//  PayloadHelpers.swift
//  Trunk
//
//  Shared helpers for parsing AnyCodable event payloads.
//  Used by EventDerivation, SoilHistoryService, and DataExportService.
//

import Foundation

/// Safely get a string value from payload
func getString(_ payload: [String: AnyCodable], _ key: String) -> String? {
    guard let codable = payload[key] else { return nil }
    return codable.value as? String
}

/// Safely get an int value from payload (handles both Int and Double)
func getInt(_ payload: [String: AnyCodable], _ key: String) -> Int? {
    guard let codable = payload[key] else { return nil }
    if let intValue = codable.value as? Int {
        return intValue
    }
    if let doubleValue = codable.value as? Double {
        return Int(doubleValue)
    }
    return nil
}

/// Safely get a double value from payload (handles both Int and Double)
func getDouble(_ payload: [String: AnyCodable], _ key: String) -> Double? {
    guard let codable = payload[key] else { return nil }
    if let doubleValue = codable.value as? Double {
        return doubleValue
    }
    if let intValue = codable.value as? Int {
        return Double(intValue)
    }
    return nil
}
