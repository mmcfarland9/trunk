//
//  SyncIndicatorView.swift
//  Trunk
//
//  Compact sync status dot. Detailed info lives in DataInfoSheet.
//

import SwiftUI

struct SyncIndicatorView: View {
  @ObservedObject var syncService = SyncService.shared

  var body: some View {
    Text(symbol)
      .font(.system(size: 12, design: .monospaced))
      .foregroundStyle(symbolColor)
      .accessibilityLabel(accessibilityText)
  }

  private var symbol: String {
    switch syncService.detailedSyncStatus {
    case .synced:
      return "\u{2713}"  // ✓
    case .offline:
      return "\u{2717}"  // ✗
    case .loading, .syncing, .pendingUpload:
      return "\u{25CF}"  // ●
    }
  }

  private var symbolColor: Color {
    switch syncService.detailedSyncStatus {
    case .synced:
      return Color(red: 0.133, green: 0.647, blue: 0.133) // #22a522
    case .offline:
      return Color(red: 0.851, green: 0.325, blue: 0.310) // #d9534f
    case .loading, .syncing:
      return Color(red: 0.902, green: 0.722, blue: 0.0)   // #e6b800
    case .pendingUpload:
      return Color(red: 0.851, green: 0.533, blue: 0.0)   // #d9880a
    }
  }

  private var accessibilityText: String {
    switch syncService.detailedSyncStatus {
    case .synced: return "Synced"
    case .offline: return "Offline"
    case .loading: return "Loading"
    case .syncing: return "Syncing"
    case .pendingUpload: return "Pushing changes"
    }
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
