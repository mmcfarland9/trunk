//
//  SyncCache.swift
//  Trunk
//
//  Cache version management for sync service.
//

import Foundation

// MARK: - Storage Constants

let cacheVersion = 1
let cacheVersionKey = "trunk-cache-version"
let lastSyncKey = "trunk-last-sync"

// MARK: - SyncService Extension

extension SyncService {

  // MARK: - Cache Management

  /// Check if cache version matches current version
  func isCacheValid() -> Bool {
    let stored = UserDefaults.standard.integer(forKey: cacheVersionKey)
    return stored == cacheVersion
  }

  /// Update stored cache version to current
  func setCacheVersion() {
    UserDefaults.standard.set(cacheVersion, forKey: cacheVersionKey)
  }

  /// Clear cache version (forces full sync on next load)
  func clearCacheVersion() {
    UserDefaults.standard.removeObject(forKey: cacheVersionKey)
  }

  /// Get last sync timestamp
  func getLastSync() -> String? {
    UserDefaults.standard.string(forKey: lastSyncKey)
  }

  /// Set last sync timestamp
  func setLastSync(_ timestamp: String) {
    UserDefaults.standard.set(timestamp, forKey: lastSyncKey)
  }

  /// Clear last sync timestamp
  func clearLastSync() {
    UserDefaults.standard.removeObject(forKey: lastSyncKey)
  }
}
