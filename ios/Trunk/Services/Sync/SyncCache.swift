//
//  SyncCache.swift
//  Trunk
//
//  Cache version management for sync service.
//

import Foundation

// MARK: - SyncService Extension

extension SyncService {

  // MARK: - Storage Constants

  private enum CacheKeys {
    static let cacheVersion = 1
    static let cacheVersionKey = "trunk-cache-version"
    static let lastSyncKey = "trunk-last-sync"
  }

  // MARK: - Cache Management

  /// Check if cache version matches current version
  func isCacheValid() -> Bool {
    let stored = UserDefaults.standard.integer(forKey: CacheKeys.cacheVersionKey)
    return stored == CacheKeys.cacheVersion
  }

  /// Update stored cache version to current
  func setCacheVersion() {
    UserDefaults.standard.set(CacheKeys.cacheVersion, forKey: CacheKeys.cacheVersionKey)
  }

  /// Clear cache version (forces full sync on next load)
  func clearCacheVersion() {
    UserDefaults.standard.removeObject(forKey: CacheKeys.cacheVersionKey)
  }

  /// Get last sync timestamp
  func getLastSync() -> String? {
    UserDefaults.standard.string(forKey: CacheKeys.lastSyncKey)
  }

  /// Set last sync timestamp
  func setLastSync(_ timestamp: String) {
    UserDefaults.standard.set(timestamp, forKey: CacheKeys.lastSyncKey)
  }

  /// Clear last sync timestamp
  func clearLastSync() {
    UserDefaults.standard.removeObject(forKey: CacheKeys.lastSyncKey)
  }
}
