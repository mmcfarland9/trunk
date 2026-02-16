//
//  SyncStatus.swift
//  Trunk
//
//  Status computation and update logic for sync service.
//

import Foundation

extension SyncService {

  // MARK: - Status Management

  /// Update lastConfirmedTimestamp from EventStore
  func refreshLastConfirmedTimestamp() {
    lastConfirmedTimestamp = EventStore.shared.lastConfirmedTimestamp
  }

  /// Recompute detailedSyncStatus based on current state
  func updateDetailedStatus() {
    if syncStatus == .syncing {
      detailedSyncStatus = .syncing
    } else if syncStatus == .error && !hasCompletedInitialSync {
      detailedSyncStatus = .loading
    } else if syncStatus == .error {
      detailedSyncStatus = .offline
    } else if EventStore.shared.hasPendingUploads {
      detailedSyncStatus = .pendingUpload
    } else {
      detailedSyncStatus = .synced
    }
  }
}
