//
//  SyncIndicatorView.swift
//  Trunk
//
//  Visual sync status indicator - cloud icon with colored dot.
//  Matches web implementation with traffic light colors.
//

import SwiftUI

struct SyncIndicatorView: View {
    @ObservedObject var syncService = SyncService.shared
    @State private var isPulsing = false

    // Traffic light colors matching web CSS
    private var dotColor: Color {
        switch syncService.syncStatus {
        case .idle:
            return Color(red: 0.533, green: 0.533, blue: 0.533) // #888
        case .syncing:
            return Color(red: 0.902, green: 0.722, blue: 0.0)   // #e6b800
        case .success:
            return Color(red: 0.133, green: 0.647, blue: 0.133) // #22a522
        case .error:
            return Color(red: 0.851, green: 0.325, blue: 0.310) // #d9534f
        }
    }

    private var statusText: String {
        switch syncService.syncStatus {
        case .idle: return "Sync: idle"
        case .syncing: return "Sync: syncing"
        case .success: return "Sync: success"
        case .error: return "Sync: error"
        }
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            // Cloud icon
            Image(systemName: "cloud.fill")
                .font(.system(size: 14))
                .foregroundStyle(Color.inkFaint.opacity(0.7))

            // Status dot
            Circle()
                .fill(dotColor)
                .frame(width: 6, height: 6)
                .overlay(
                    Circle()
                        .stroke(Color.paper, lineWidth: 1)
                )
                .offset(x: 2, y: 2)
                .opacity(syncService.syncStatus == .syncing ? (isPulsing ? 0.4 : 1.0) : 1.0)
        }
        .accessibilityLabel(statusText)
        .onChange(of: syncService.syncStatus) { _, newStatus in
            if newStatus == .syncing {
                withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                    isPulsing = true
                }
            } else {
                withAnimation(.none) {
                    isPulsing = false
                }
            }
        }
        .onAppear {
            if syncService.syncStatus == .syncing {
                withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                    isPulsing = true
                }
            }
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
