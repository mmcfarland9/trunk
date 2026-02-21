//
//  EventCacheIO.swift
//  Trunk
//
//  Dedicated actor for event cache disk I/O.
//  Separated from EventStore to avoid @MainActor inference on file I/O.
//

import Foundation

/// Raw file I/O only — reads and writes Data.
/// Encoding/decoding stays on @MainActor in EventStore where the types live.
/// This avoids Codable conformances ever crossing an actor boundary.
actor EventCacheIO {
    static let shared = EventCacheIO()

    private static var cacheFileURL: URL {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let trunkDir = appSupport.appendingPathComponent("Trunk", isDirectory: true)
        return trunkDir.appendingPathComponent("events-cache.json")
    }

    /// Read raw bytes from the cache file (returns nil if missing or unreadable)
    func readData() -> Data? {
        let fileURL = Self.cacheFileURL
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            print("EventCacheIO: No cache file found")
            return nil
        }

        do {
            return try Data(contentsOf: fileURL)
        } catch {
            print("EventCacheIO: Failed to read cache — \(error.localizedDescription)")
            return nil
        }
    }

    /// Write raw bytes to the cache file atomically
    func writeData(_ data: Data) {
        do {
            let dirURL = Self.cacheFileURL.deletingLastPathComponent()
            try FileManager.default.createDirectory(at: dirURL, withIntermediateDirectories: true)
            try data.write(to: Self.cacheFileURL, options: .atomic)
        } catch {
            print("EventCacheIO: Failed to write cache — \(error.localizedDescription)")
        }
    }
}
