//
//  Timeout.swift
//  Trunk
//
//  Async timeout utility. Matches web app's 15s abort signal pattern.
//

import Foundation

enum TimeoutError: LocalizedError {
  case timedOut(seconds: TimeInterval)

  var errorDescription: String? {
    switch self {
    case .timedOut(let seconds):
      return "Operation timed out after \(Int(seconds))s"
    }
  }
}

/// Run an async operation with a timeout.
/// If the operation doesn't complete within the specified duration,
/// it is cancelled and `TimeoutError.timedOut` is thrown.
func withTimeout<T: Sendable>(
  seconds: TimeInterval,
  operation: @Sendable @escaping () async throws -> T
) async throws -> T {
  try await withThrowingTaskGroup(of: T.self) { group in
    group.addTask {
      try await operation()
    }
    group.addTask {
      try await Task.sleep(for: .seconds(seconds))
      throw TimeoutError.timedOut(seconds: seconds)
    }
    guard let result = try await group.next() else {
      throw TimeoutError.timedOut(seconds: seconds)
    }
    group.cancelAll()
    return result
  }
}
