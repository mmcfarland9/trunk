//
//  SettingsView.swift
//  Trunk
//
//  App settings, history logs, and data management.
//

import SwiftUI
import UniformTypeIdentifiers
import Auth

struct SettingsView: View {
    @Bindable var progression: ProgressionViewModel

    @State private var showingExportSheet = false
    @State private var showingImportPicker = false
    @State private var showingImportConfirm = false
    @State private var exportURL: URL?
    @State private var importPayload: ExportPayload?
    @State private var alertMessage = ""
    @State private var showingAlert = false

    // Derived state from EventStore
    private var state: DerivedState {
        EventStore.shared.getState()
    }

    private var sproutCount: Int {
        state.sprouts.count
    }

    private var leafCount: Int {
        state.leaves.count
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space5) {
                    // History section
                    historySection

                    // Cloud sync section (when authenticated)
                    if AuthService.shared.isAuthenticated {
                        cloudSyncSection
                    } else {
                        // Data section (import/export when not authenticated)
                        dataSection
                    }

                    // About section
                    aboutSection
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
        .sheet(isPresented: $showingExportSheet) {
            if let url = exportURL {
                ShareSheet(activityItems: [url])
            }
        }
        .fileImporter(
            isPresented: $showingImportPicker,
            allowedContentTypes: [.json],
            allowsMultipleSelection: false
        ) { result in
            handleFileImport(result)
        }
        .alert("Import Data", isPresented: $showingImportConfirm) {
            Button("Cancel", role: .cancel) {
                importPayload = nil
            }
            Button("Import", role: .destructive) {
                performImport()
            }
        } message: {
            if let payload = importPayload {
                Text("This will replace all current data with \(payload.events.count) events from the backup. This cannot be undone.")
            }
        }
        .alert("Notice", isPresented: $showingAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(alertMessage)
        }
    }

    // MARK: - Sections

    private var cloudSyncSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("CLOUD SYNC")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 1) {
                Button {
                    Task {
                        try? await AuthService.shared.signOut()
                    }
                } label: {
                    HStack {
                        Text("🚪")
                            .font(.system(size: TrunkTheme.textBase))
                            .frame(width: 24)

                        Text("Sign Out")
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .foregroundStyle(Color.ink)

                        Spacer()

                        Text(">")
                            .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                    .padding(TrunkTheme.space3)
                    .contentShape(Rectangle())
                }
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )

            if let email = AuthService.shared.user?.email {
                Text("Signed in as \(email)")
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }

            Text("Syncs automatically")
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
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
                    exportData()
                } label: {
                    SettingsRow(icon: "↑", title: "Export Data", subtitle: "Download JSON backup")
                }

                Button {
                    showingImportPicker = true
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

                    Text("0.1.0")
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

                HStack {
                    Text("Total Sprouts")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.ink)

                    Spacer()

                    Text("\(sproutCount)")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }
                .padding(TrunkTheme.space3)

                HStack {
                    Text("Total Leaves")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.ink)

                    Spacer()

                    Text("\(leafCount)")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
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

    // MARK: - Export

    private func exportData() {
        // For cloud-synced users, export should come from EventStore.shared.events
        // For now, this is a stub - import/export will be updated in a future task
        alertMessage = "Export from events not yet implemented. Please use cloud sync."
        showingAlert = true
    }

    // MARK: - Import

    private func handleFileImport(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }

            // Need to access security-scoped resource
            guard url.startAccessingSecurityScopedResource() else {
                alertMessage = "Cannot access file"
                showingAlert = true
                return
            }

            defer { url.stopAccessingSecurityScopedResource() }

            do {
                let data = try Data(contentsOf: url)
                let payload = try DataExportService.parseImport(data)

                guard payload.version >= 4 else {
                    alertMessage = "This backup is from an older format (v\(payload.version)). Please export a new backup from the web app."
                    showingAlert = true
                    return
                }

                importPayload = payload
                showingImportConfirm = true

            } catch {
                alertMessage = "Invalid backup file: \(error.localizedDescription)"
                showingAlert = true
            }

        case .failure(let error):
            alertMessage = "Import failed: \(error.localizedDescription)"
            showingAlert = true
        }
    }

    private func performImport() {
        guard let payload = importPayload else { return }

        // Convert TrunkEvents to SyncEvent format and populate EventStore
        var syncEvents: [SyncEvent] = []
        for event in payload.events {
            if let syncEvent = convertTrunkEventToSyncEvent(event) {
                syncEvents.append(syncEvent)
            }
        }

        // Replace events in EventStore
        EventStore.shared.setEvents(syncEvents)

        // Note: Custom labels (circles) are no longer stored locally.
        // In pure cloud architecture, labels come from SharedConstants.
        // Custom label support via events can be added in a future update.

        importPayload = nil
        alertMessage = "Imported \(syncEvents.count) events from backup."
        showingAlert = true
    }

    /// Convert a TrunkEvent to SyncEvent format
    private func convertTrunkEventToSyncEvent(_ event: TrunkEvent) -> SyncEvent? {
        var payload: [String: AnyCodable] = [:]

        // Copy all non-nil fields to payload
        if let sproutId = event.sproutId { payload["sproutId"] = AnyCodable(sproutId) }
        if let twigId = event.twigId { payload["twigId"] = AnyCodable(twigId) }
        if let title = event.title { payload["title"] = AnyCodable(title) }
        if let season = event.season { payload["season"] = AnyCodable(season) }
        if let environment = event.environment { payload["environment"] = AnyCodable(environment) }
        if let soilCost = event.soilCost { payload["soilCost"] = AnyCodable(soilCost) }
        if let leafId = event.leafId { payload["leafId"] = AnyCodable(leafId) }
        if let bloomWither = event.bloomWither { payload["bloomWither"] = AnyCodable(bloomWither) }
        if let bloomBudding = event.bloomBudding { payload["bloomBudding"] = AnyCodable(bloomBudding) }
        if let bloomFlourish = event.bloomFlourish { payload["bloomFlourish"] = AnyCodable(bloomFlourish) }
        if let content = event.content { payload["note"] = AnyCodable(content) }
        if let prompt = event.prompt { payload["prompt"] = AnyCodable(prompt) }
        if let result = event.result { payload["result"] = AnyCodable(result) }
        if let reflection = event.reflection { payload["reflection"] = AnyCodable(reflection) }
        if let capacityGained = event.capacityGained { payload["capacityGained"] = AnyCodable(capacityGained) }
        if let soilReturned = event.soilReturned { payload["soilReturned"] = AnyCodable(soilReturned) }
        if let twigLabel = event.twigLabel { payload["twigLabel"] = AnyCodable(twigLabel) }
        if let name = event.name { payload["name"] = AnyCodable(name) }

        // Generate dummy UUID for imported events (they don't have real server IDs)
        return SyncEvent(
            id: UUID(),
            userId: UUID(), // Dummy user ID for imported events
            type: event.type.rawValue,
            payload: payload,
            clientId: "import",
            clientTimestamp: event.timestamp,
            createdAt: event.timestamp
        )
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
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
}
