//
//  PayloadHelpers.swift
//  Trunk
//
//  Shared helpers for parsing JSONValue event payloads.
//  Used by EventDerivation, SoilHistoryService, and DataExportService.
//

import Foundation

/// Safely get a string value from payload
func getString(_ payload: [String: JSONValue], _ key: String) -> String? {
    payload[key]?.stringValue
}

/// Safely get an int value from payload (handles both Int and Double)
func getInt(_ payload: [String: JSONValue], _ key: String) -> Int? {
    guard let value = payload[key] else { return nil }
    switch value {
    case .int(let v): return v
    case .double(let v): return Int(v)
    default: return nil
    }
}

/// Safely get a double value from payload (handles both Int and Double)
func getDouble(_ payload: [String: JSONValue], _ key: String) -> Double? {
    guard let value = payload[key] else { return nil }
    switch value {
    case .double(let v): return v
    case .int(let v): return Double(v)
    default: return nil
    }
}
