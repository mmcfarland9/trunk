//
//  SyncEvent.swift
//  Trunk
//
//  Event model for Supabase sync.
//

import Foundation

// REVIEW: Added event type validation via enum. Alternative: validate against known string set
// without enum. Enum provides compile-time safety.
enum TrunkEventType: String, Codable, Sendable {
    case sproutPlanted = "sprout_planted"
    case sproutWatered = "sprout_watered"
    case sproutHarvested = "sprout_harvested"
    case sproutUprooted = "sprout_uprooted"
    case sunShone = "sun_shone"
    case leafCreated = "leaf_created"

}

struct SyncEvent: Codable, Sendable, Identifiable {
    let id: UUID
    let userId: UUID
    let type: String
    let payload: [String: JSONValue]
    let clientId: String
    let clientTimestamp: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case type
        case payload
        case clientId = "client_id"
        case clientTimestamp = "client_timestamp"
        case createdAt = "created_at"
    }
}

/// Payload for inserting a new event (without server-generated fields)
struct SyncEventInsert: Codable, Sendable {
    let userId: String
    let type: String
    let payload: [String: JSONValue]
    let clientId: String
    let clientTimestamp: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case type
        case payload
        case clientId = "client_id"
        case clientTimestamp = "client_timestamp"
    }
}

/// Type-safe JSON value enum — replaces AnyCodable for Sendable conformance
enum JSONValue: Codable, Sendable, Equatable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    // MARK: - Computed Properties

    var stringValue: String? {
        if case .string(let v) = self { return v }
        return nil
    }

    var intValue: Int? {
        if case .int(let v) = self { return v }
        return nil
    }

    var doubleValue: Double? {
        switch self {
        case .double(let v): return v
        case .int(let v): return Double(v)
        default: return nil
        }
    }

    // MARK: - Codable

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        // Decode order matters: String must come before Int/Double (to avoid
        // numeric strings being decoded as numbers), and Int before Double
        // (so whole numbers like 1 are Int, not Double 1.0).
        if let string = try? container.decode(String.self) {
            self = .string(string)
        } else if let int = try? container.decode(Int.self) {
            self = .int(int)
        } else if let double = try? container.decode(Double.self) {
            self = .double(double)
        } else if let bool = try? container.decode(Bool.self) {
            self = .bool(bool)
        } else if let dict = try? container.decode([String: JSONValue].self) {
            self = .object(dict)
        } else if let array = try? container.decode([JSONValue].self) {
            self = .array(array)
        } else if container.decodeNil() {
            self = .null
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode JSON value")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let v): try container.encode(v)
        case .int(let v): try container.encode(v)
        case .double(let v): try container.encode(v)
        case .bool(let v): try container.encode(v)
        case .object(let v): try container.encode(v)
        case .array(let v): try container.encode(v)
        case .null: try container.encodeNil()
        }
    }
}

// MARK: - Literal Conformances

extension JSONValue: ExpressibleByStringLiteral {
    init(stringLiteral value: String) { self = .string(value) }
}

extension JSONValue: ExpressibleByIntegerLiteral {
    init(integerLiteral value: Int) { self = .int(value) }
}

extension JSONValue: ExpressibleByFloatLiteral {
    init(floatLiteral value: Double) { self = .double(value) }
}

extension JSONValue: ExpressibleByBooleanLiteral {
    init(booleanLiteral value: Bool) { self = .bool(value) }
}

extension JSONValue: ExpressibleByNilLiteral {
    init(nilLiteral: ()) { self = .null }
}
