//
//  EventStore.swift
//  Trunk
//
//  Manages cloud events and derived state - port of web's store.ts.
//  Events are fetched from Supabase and state is derived locally.
//  Persists events to a JSON cache file for offline resilience.
//

import Foundation
import Combine

// MARK: - Cache Model

struct CachedEventStore: Codable, Sendable {
  let events: [SyncEvent]
  let pendingUploadClientIds: [String]
  let lastSyncTimestamp: String?
  let cacheVersion: Int
  let lastWrittenAt: String
}

@MainActor
final class EventStore: ObservableObject {
  static let shared = EventStore()

  // Cached events from cloud + local optimistic
  @Published private(set) var events: [SyncEvent] = []

  // Track which events haven't been confirmed by the server yet
  private(set) var pendingUploadClientIds: Set<String> = []

  // Cached derived state (invalidated on event changes)
  private var cachedState: DerivedState?
  private var cachedWaterAvailable: Int?
  private var cachedSunAvailable: Int?
  private var cachedStreak: WateringStreak?

  // Debounced disk write
  private var writeTask: Task<Void, Never>?
  private static let writeDebounceInterval: TimeInterval = 0.5

  private init() {
    // Read raw bytes off main thread, decode on main thread
    Task { [weak self] in
      let data = await EventCacheIO.shared.readData()
      guard let self else { return }
      guard let data else {
        print("EventStore: No cache found, starting fresh")
        return
      }
      do {
        let cached = try JSONDecoder().decode(CachedEventStore.self, from: data)
        self.events = cached.events
        self.pendingUploadClientIds = Set(cached.pendingUploadClientIds)
        print("EventStore: Loaded \(cached.events.count) events from cache (\(cached.pendingUploadClientIds.count) pending)")
      } catch {
        print("EventStore: Failed to decode cache, starting fresh — \(error.localizedDescription)")
      }
    }
  }

  // MARK: - Event Management

  /// Replace all events (after pulling from cloud)
  func setEvents(_ newEvents: [SyncEvent]) {
    events = newEvents
    // After a full pull, all events are server-confirmed — clear pending set,
    // but retain any pending clientIds that still match events in the new set
    // (in case a local optimistic event wasn't in the server response yet)
    let newClientIds = Set(newEvents.map(\.clientId))
    pendingUploadClientIds = pendingUploadClientIds.intersection(newClientIds)
    invalidateCache()
    scheduleDiskWrite()
  }

  /// Append a single event (after pushing to cloud or optimistic local)
  func appendEvent(_ event: SyncEvent) {
    events.append(event)
    invalidateCache()
    scheduleDiskWrite()
  }

  /// Append multiple events then invalidate caches once (for batch sync)
  func appendEvents(_ newEvents: [SyncEvent]) {
    guard !newEvents.isEmpty else { return }
    events.append(contentsOf: newEvents)
    invalidateCache()
    scheduleDiskWrite()
  }

  /// Remove a single event by clientId (used for rollback if needed)
  func removeEvent(withClientId clientId: String) {
    events.removeAll { $0.clientId == clientId }
    pendingUploadClientIds.remove(clientId)
    invalidateCache()
    scheduleDiskWrite()
  }

  /// Clear all events (for logout)
  func clearEvents() {
    events = []
    pendingUploadClientIds = []
    invalidateCache()
    scheduleDiskWrite()
  }

  // MARK: - Pending Upload Tracking

  /// Mark an event as pending upload (optimistic, not yet server-confirmed)
  func markPendingUpload(clientId: String) {
    pendingUploadClientIds.insert(clientId)
    scheduleDiskWrite()
  }

  /// Mark an event as confirmed by server (remove from pending)
  func markConfirmed(clientId: String) {
    pendingUploadClientIds.remove(clientId)
    scheduleDiskWrite()
  }

  /// Get all events that are pending upload
  var pendingEvents: [SyncEvent] {
    events.filter { pendingUploadClientIds.contains($0.clientId) }
  }

  /// Whether there are events waiting to be pushed
  var hasPendingUploads: Bool { !pendingUploadClientIds.isEmpty }

  /// Number of events waiting to be pushed
  var pendingUploadCount: Int { pendingUploadClientIds.count }

  /// The created_at of the most recently confirmed (non-pending) event
  var lastConfirmedTimestamp: String? {
    events
      .filter { !pendingUploadClientIds.contains($0.clientId) }
      .map(\.createdAt)
      .max()
  }

  // MARK: - State Derivation

  /// Get derived state (cached)
  func getState() -> DerivedState {
    if let cached = cachedState {
      return cached
    }
    let state = deriveState(from: events)
    cachedState = state
    return state
  }

  /// Get water available (cached)
  func getWaterAvailable(now: Date = Date()) -> Int {
    if let cached = cachedWaterAvailable {
      return cached
    }
    let water = deriveWaterAvailable(from: events, now: now)
    cachedWaterAvailable = water
    return water
  }

  /// Get sun available (cached)
  func getSunAvailable(now: Date = Date()) -> Int {
    if let cached = cachedSunAvailable {
      return cached
    }
    let sun = deriveSunAvailable(from: events, now: now)
    cachedSunAvailable = sun
    return sun
  }

  /// Get watering streak (cached)
  func getWateringStreak(now: Date = Date()) -> WateringStreak {
    if let cached = cachedStreak {
      return cached
    }
    let streak = deriveWateringStreak(from: events, now: now)
    cachedStreak = streak
    return streak
  }

  /// Check if sprout was watered this week
  func checkSproutWateredThisWeek(sproutId: String, now: Date = Date()) -> Bool {
    wasSproutWateredThisWeek(events: events, sproutId: sproutId, now: now)
  }

  // MARK: - Cache Management

  private func invalidateCache() {
    cachedState = nil
    cachedWaterAvailable = nil
    cachedSunAvailable = nil
    cachedStreak = nil
  }

  /// Force refresh (e.g., when crossing time boundaries)
  func refresh() {
    invalidateCache()
  }

  // MARK: - Disk Persistence

  /// Encode current state to Data (runs on @MainActor where events are accessible)
  private func encodeCache() -> Data? {
    let cached = CachedEventStore(
      events: events,
      pendingUploadClientIds: Array(pendingUploadClientIds),
      lastSyncTimestamp: lastConfirmedTimestamp,
      cacheVersion: 1,
      lastWrittenAt: ISO8601DateFormatter().string(from: Date())
    )

    do {
      let encoder = JSONEncoder()
      encoder.outputFormatting = .prettyPrinted
      return try encoder.encode(cached)
    } catch {
      print("EventStore: Failed to encode cache — \(error.localizedDescription)")
      return nil
    }
  }

  /// Schedule a debounced write to disk via EventCacheIO (off main thread)
  private func scheduleDiskWrite() {
    writeTask?.cancel()
    writeTask = Task { [weak self] in
      try? await Task.sleep(nanoseconds: UInt64(Self.writeDebounceInterval * 1_000_000_000))
      guard !Task.isCancelled else { return }
      guard let data = self?.encodeCache() else { return }
      await EventCacheIO.shared.writeData(data)
    }
  }

  /// Force an immediate write (e.g., before app goes to background).
  /// Encodes synchronously on @MainActor, then dispatches I/O to EventCacheIO.
  func flushToDisk() {
    writeTask?.cancel()
    guard let data = encodeCache() else { return }
    Task.detached {
      await EventCacheIO.shared.writeData(data)
    }
  }
}
