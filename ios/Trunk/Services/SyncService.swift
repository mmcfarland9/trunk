//
//  SyncService.swift
//  Trunk
//
//  Cloud sync service for push/pull events via Supabase.
//  Implementation is split across sub-modules in Services/Sync/
//

import Foundation
import Combine
import Supabase
import Realtime

// MARK: - Sync Types

enum SyncStatus: String {
  case idle
  case syncing
  case success
  case error
}

enum DetailedSyncStatus: String {
  case synced         // All events confirmed, no pending, last check found nothing new
  case syncing        // Currently pulling/pushing
  case pendingUpload  // Has local events not yet pushed
  case offline        // Last sync attempt failed
  case loading        // No cache, first sync in progress
}

enum SyncMode: String {
  case incremental
  case full
}

struct SyncResult {
  let status: SyncStatus
  let pulled: Int
  let pushed: Int
  let error: String?
  let mode: SyncMode
}

enum SyncError: LocalizedError {
  case notConfigured
  case notAuthenticated

  var errorDescription: String? {
    switch self {
    case .notConfigured:
      return "Supabase is not configured"
    case .notAuthenticated:
      return "Not authenticated"
    }
  }
}

// MARK: - SyncService

@MainActor
final class SyncService: ObservableObject {
  static let shared = SyncService()

  // MARK: - Published Properties

  // Note: setters are internal (not private) because SyncOperations.swift
  // and SyncStatus.swift — extensions in separate files — need write access.
  @Published var syncStatus: SyncStatus = .syncing
  @Published var detailedSyncStatus: DetailedSyncStatus = .loading
  @Published var lastConfirmedTimestamp: String? = nil

  // MARK: - Internal Properties (accessed by extensions)

  var realtimeChannel: RealtimeChannelV2?
  var onRealtimeEvent: ((SyncEvent) -> Void)?
  var hasCompletedInitialSync = false

  // MARK: - Initialization

  private init() {}

  /// Reset sync status when sync is not applicable (e.g., not authenticated
  /// or Supabase not configured). Prevents the icon from showing amber
  /// indefinitely in local-only mode.
  func markNotNeeded() {
    syncStatus = .idle
    detailedSyncStatus = .synced
  }

  // MARK: - Helpers

  func randomString(length: Int) -> String {
    let letters = "abcdefghijklmnopqrstuvwxyz0123456789"
    return String((0..<length).compactMap { _ in letters.randomElement() })
  }
}
