//
//  DataInfoSheet.swift
//  Trunk
//
//  Data overview sheet showing key stats and account info.
//

import SwiftUI
import Auth

struct DataInfoSheet: View {
    @Bindable var progression: ProgressionViewModel

    @Environment(AuthService.self) private var authService
    @Environment(\.dismiss) private var dismiss

    private var state: DerivedState {
        EventStore.shared.getState()
    }

    private var eventCount: Int {
        EventStore.shared.events.count
    }

    private var completedCount: Int {
        state.sprouts.values.filter { $0.state == .completed }.count
    }

    private var activeCount: Int {
        state.sprouts.values.filter { $0.state == .active }.count
    }

    private var leafCount: Int {
        state.leaves.count
    }

    private var memberSince: String? {
        guard let firstEvent = EventStore.shared.events.first else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = formatter.date(from: firstEvent.clientTimestamp)
            ?? ISO8601DateFormatter().date(from: firstEvent.clientTimestamp)
        guard let date else { return nil }
        let display = DateFormatter()
        display.dateStyle = .medium
        display.timeStyle = .none
        return display.string(from: date)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.parchment
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                        // Soil section
                        dataCard {
                            VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                                Text("SOIL")
                                    .monoLabel(size: TrunkTheme.textXs)

                                dataRow(
                                    label: "Capacity",
                                    value: String(format: "%.1f", progression.soilCapacity)
                                )
                                dataRow(
                                    label: "Available",
                                    value: String(format: "%.1f", progression.soilAvailable)
                                )
                            }
                        }

                        // Sprouts section
                        dataCard {
                            VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                                Text("SPROUTS")
                                    .monoLabel(size: TrunkTheme.textXs)

                                dataRow(label: "Active", value: "\(activeCount)")
                                dataRow(label: "Completed", value: "\(completedCount)")
                                dataRow(label: "Leaves", value: "\(leafCount)")
                            }
                        }

                        // Activity section
                        dataCard {
                            VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                                Text("ACTIVITY")
                                    .monoLabel(size: TrunkTheme.textXs)

                                dataRow(label: "Total events", value: "\(eventCount)")
                                if let since = memberSince {
                                    dataRow(label: "Since", value: since)
                                }
                            }
                        }

                        // Account section
                        if authService.isAuthenticated {
                            dataCard {
                                VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                                    Text("ACCOUNT")
                                        .monoLabel(size: TrunkTheme.textXs)

                                    if let email = authService.user?.email {
                                        dataRow(label: "Email", value: email)
                                    }
                                    if let name = authService.userFullName {
                                        dataRow(label: "Name", value: name)
                                    }
                                }
                            }
                        }
                    }
                    .padding(TrunkTheme.space4)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("DATA")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .tracking(2)
                        .foregroundStyle(Color.wood)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .foregroundStyle(Color.ink)
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Helpers

    private func dataCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(TrunkTheme.space3)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
    }

    private func dataRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            Spacer()

            Text(value)
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.ink)
        }
    }
}

#Preview {
    DataInfoSheet(progression: ProgressionViewModel())
        .environment(AuthService.shared)
}
