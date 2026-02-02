//
//  SyncEvent.swift
//  Trunk
//
//  Event model for Supabase sync.
//

import Foundation

struct SyncEvent: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let type: String
    let payload: [String: AnyCodable]
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
struct SyncEventInsert: Codable {
    let userId: String
    let type: String
    let payload: [String: AnyCodable]
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

/// For encoding/decoding arbitrary JSON
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let string = try? container.decode(String.self) {
            value = string
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if container.decodeNil() {
            value = NSNull()
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode value")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let string as String:
            try container.encode(string)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let bool as Bool:
            try container.encode(bool)
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case is NSNull:
            try container.encodeNil()
        default:
            throw EncodingError.invalidValue(value, .init(codingPath: [], debugDescription: "Cannot encode value"))
        }
    }
}
