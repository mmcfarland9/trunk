//
//  SyncIndicatorView.swift
//  Trunk
//
//  Text-based sync status indicator showing last confirmed timestamp
//  and current sync state. Replaces the old cloud icon indicator.
//

import SwiftUI

struct SyncIndicatorView: View {
  @ObservedObject var syncService = SyncService.shared

  var body: some View {
    HStack(spacing: 4) {
      // Timestamp portion — always yellow
      Text(timestampText)
        .font(.system(size: 10, design: .monospaced))
        .foregroundStyle(Color(red: 0.902, green: 0.722, blue: 0.0)) // #e6b800

      // Status suffix — color varies
      Text(statusSuffix)
        .font(.system(size: 10, design: .monospaced))
        .foregroundStyle(statusColor)
    }
    .accessibilityLabel(accessibilityText)
  }

  private var timestampText: String {
    if let ts = syncService.lastConfirmedTimestamp {
      return formatTimestamp(ts)
    }
    return ""
  }

  private var statusSuffix: String {
    switch syncService.detailedSyncStatus {
    case .loading: return "Syncing..."
    case .syncing: return "Syncing..."
    case .synced: return "\u{2713} Synced"
    case .pendingUpload: return "\u{2191} Pushing..."
    case .offline: return "\u{2717} Offline"
    }
  }

  private var statusColor: Color {
    switch syncService.detailedSyncStatus {
    case .loading, .syncing:
      return Color(red: 0.902, green: 0.722, blue: 0.0) // #e6b800
    case .synced:
      return Color(red: 0.133, green: 0.647, blue: 0.133) // #22a522
    case .pendingUpload:
      return Color(red: 0.851, green: 0.533, blue: 0.0) // #d9880a
    case .offline:
      return Color(red: 0.851, green: 0.325, blue: 0.310) // #d9534f
    }
  }

  private var accessibilityText: String {
    let ts = syncService.lastConfirmedTimestamp ?? "unknown"
    return "Last sync: \(ts). Status: \(statusSuffix)"
  }

  /// Parse ISO 8601 string, output as yyyy-MM-dd'T'HH:mm:ssZ (UTC, no fractional seconds).
  /// If parsing fails, return the raw string truncated at the seconds boundary.
  private func formatTimestamp(_ iso: String) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    if let date = formatter.date(from: iso) {
      let output = ISO8601DateFormatter()
      output.formatOptions = [.withInternetDateTime]
      output.timeZone = TimeZone(identifier: "UTC")
      return output.string(from: date)
    }

    // Fallback: try without fractional seconds
    let fallback = ISO8601DateFormatter()
    fallback.formatOptions = [.withInternetDateTime]
    if let date = fallback.date(from: iso) {
      let output = ISO8601DateFormatter()
      output.formatOptions = [.withInternetDateTime]
      output.timeZone = TimeZone(identifier: "UTC")
      return output.string(from: date)
    }

    // Last resort: truncate raw string at seconds boundary
    if let dotIndex = iso.firstIndex(of: ".") {
      return String(iso[..<dotIndex]) + "Z"
    }
    return iso
  }
}

#Preview {
  VStack(spacing: 20) {
    HStack(spacing: 20) {
      Text("Status indicator")
      SyncIndicatorView()
    }
  }
  .padding()
  .background(Color.parchment)
}
