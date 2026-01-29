//
//  SettingsView.swift
//  Trunk
//
//  App settings, history logs, and data management.
//

import SwiftUI
import SwiftData

struct SettingsView: View {
    @Bindable var progression: ProgressionViewModel

    @AppStorage("trunk-user-name") private var userName: String = ""

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space5) {
                    // Profile section
                    profileSection

                    // History section
                    historySection

                    // Data section
                    dataSection

                    // About section
                    aboutSection

                    // Debug section (development only)
                    #if DEBUG
                    debugSection
                    #endif
                }
                .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("SETTINGS")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.wood)
            }
        }
    }

    // MARK: - Sections

    private var profileSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("PROFILE")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 0) {
                HStack {
                    Text("Name")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.ink)

                    Spacer()

                    TextField("Your name", text: $userName)
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.inkLight)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 150)
                }
                .padding(TrunkTheme.space3)
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }

    private var historySection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("HISTORY")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 1) {
                NavigationLink {
                    WaterLogView()
                } label: {
                    SettingsRow(icon: "💧", title: "Water Log")
                }

                NavigationLink {
                    SunLogView()
                } label: {
                    SettingsRow(icon: "☀️", title: "Sun Log")
                }

                NavigationLink {
                    SoilLogView()
                } label: {
                    SettingsRow(icon: "🪴", title: "Soil Log")
                }
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }

    private var dataSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("DATA")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 1) {
                Button {
                    // TODO: Implement export
                } label: {
                    SettingsRow(icon: "↑", title: "Export Data", subtitle: "Download JSON backup")
                }

                Button {
                    // TODO: Implement import
                } label: {
                    SettingsRow(icon: "↓", title: "Import Data", subtitle: "Restore from backup")
                }
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("ABOUT")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 1) {
                HStack {
                    Text("Version")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.ink)

                    Spacer()

                    Text("1.0.0")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }
                .padding(TrunkTheme.space3)

                HStack {
                    Text("Soil Capacity")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.ink)

                    Spacer()

                    Text("\(progression.soilCapacityInt)")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.twig)
                }
                .padding(TrunkTheme.space3)
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }

    #if DEBUG
    private var debugSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("DEBUG")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 1) {
                Button {
                    progression.resetToDefaults()
                } label: {
                    SettingsRow(icon: "⟲", title: "Reset Resources", subtitle: "Reset soil, water, sun to defaults")
                }
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }
    #endif
}

// MARK: - Settings Row

struct SettingsRow: View {
    let icon: String
    let title: String
    var subtitle: String? = nil

    var body: some View {
        HStack {
            Text(icon)
                .font(.system(size: TrunkTheme.textBase))
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .foregroundStyle(Color.ink)

                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }
            }

            Spacer()

            Text(">")
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
        .padding(TrunkTheme.space3)
        .contentShape(Rectangle())
    }
}

#Preview {
    NavigationStack {
        SettingsView(progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
