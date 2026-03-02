//
//  SettingsView.swift
//  Trunk
//
//  Account settings sheet: display name, timezone, theme, sign out, reset data.
//

import SwiftUI
import Auth
import UniformTypeIdentifiers

struct TrunkExportDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }

    var data: Data

    init(data: Data) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

struct SettingsView: View {
    @Bindable var progression: ProgressionViewModel

    @Environment(AuthService.self) private var authService
    @Environment(\.dismiss) private var dismiss

    @State private var displayName = ""
    @State private var selectedTimezone = TimeZone.current.identifier
    @State private var isSaving = false
    @State private var saveMessage: String?
    @State private var isDeleting = false
    @State private var showResetConfirmation = false
    @State private var deleteError: String?

    // Export/Import
    @State private var showExporter = false
    @State private var exportDocument: TrunkExportDocument?
    @State private var exportError: String?
    @State private var showImporter = false
    @State private var importPayload: ExportPayload?
    @State private var showImportConfirmation = false
    @State private var isImporting = false
    @State private var importError: String?

    private var hasChanges: Bool {
        let currentName = authService.userFullName ?? ""
        let currentTz = authService.userTimezone ?? TimeZone.current.identifier
        return displayName.trimmingCharacters(in: .whitespacesAndNewlines) != currentName
            || selectedTimezone != currentTz
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.parchment
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: TrunkTheme.space4) {
                        // Account info (read-only)
                        if let email = authService.user?.email {
                            settingsCard {
                                VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                                    Text("ACCOUNT")
                                        .monoLabel(size: TrunkTheme.textXs)

                                    settingsRow(label: "Email", value: email)
                                }
                            }
                        }

                        // Profile fields
                        settingsCard {
                            VStack(alignment: .leading, spacing: TrunkTheme.space3) {
                                Text("PROFILE")
                                    .monoLabel(size: TrunkTheme.textXs)

                                VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                                    Text("DISPLAY NAME")
                                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                        .foregroundStyle(Color.inkFaint)
                                        .tracking(TrunkTheme.trackingUppercase)

                                    TextField("Your name", text: $displayName)
                                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                                        .foregroundStyle(Color.ink)
                                        .padding(TrunkTheme.space3)
                                        .background(Color.paper)
                                        .overlay(
                                            Rectangle()
                                                .stroke(Color.border, lineWidth: 1)
                                        )
                                }

                                VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                                    Text("TIMEZONE")
                                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                        .foregroundStyle(Color.inkFaint)
                                        .tracking(TrunkTheme.trackingUppercase)

                                    Picker("Timezone", selection: $selectedTimezone) {
                                        ForEach(Self.commonTimezones, id: \.self) { tz in
                                            Text(Self.formatTimezone(tz))
                                                .tag(tz)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                    .tint(Color.ink)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.vertical, TrunkTheme.space2)
                                    .padding(.horizontal, TrunkTheme.space3)
                                    .background(Color.paper)
                                    .overlay(
                                        Rectangle()
                                            .stroke(Color.border, lineWidth: 1)
                                    )
                                }

                                // Save feedback
                                if let msg = saveMessage {
                                    Text(msg)
                                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                        .foregroundStyle(msg.contains("Error") ? Color.trunkDestructive : Color.twig)
                                }

                                Button {
                                    saveProfile()
                                } label: {
                                    Text(isSaving ? "SAVING..." : "SAVE")
                                }
                                .buttonStyle(.trunk)
                                .disabled(!hasChanges || isSaving)
                                .opacity(hasChanges && !isSaving ? 1 : 0.5)
                                .frame(maxWidth: .infinity, alignment: .trailing)
                            }
                        }

                        // Data management
                        settingsCard {
                            VStack(alignment: .leading, spacing: TrunkTheme.space3) {
                                Text("DATA")
                                    .monoLabel(size: TrunkTheme.textXs)

                                Text("Export or import your data as JSON. Import replaces all existing data.")
                                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                    .foregroundStyle(Color.inkFaint)

                                Button {
                                    exportData()
                                } label: {
                                    Text("EXPORT DATA")
                                }
                                .buttonStyle(.trunk)

                                Button {
                                    showImporter = true
                                } label: {
                                    Text(isImporting ? "IMPORTING..." : "IMPORT DATA")
                                }
                                .buttonStyle(.trunk)
                                .disabled(isImporting)
                                .opacity(isImporting ? 0.5 : 1)

                                if let error = exportError {
                                    Text(error)
                                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                        .foregroundStyle(Color.trunkDestructive)
                                }

                                if let error = importError {
                                    Text(error)
                                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                        .foregroundStyle(Color.trunkDestructive)
                                }
                            }
                        }

                        // Danger zone
                        settingsCard {
                            VStack(alignment: .leading, spacing: TrunkTheme.space3) {
                                Text("DANGER ZONE")
                                    .monoLabel(size: TrunkTheme.textXs)

                                VStack(alignment: .leading, spacing: TrunkTheme.space1) {
                                    Text("Permanently delete all your sprouts, leaves, journal entries, and activity history.")
                                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                        .foregroundStyle(Color.inkFaint)

                                    if let error = deleteError {
                                        Text(error)
                                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                            .foregroundStyle(Color.trunkDestructive)
                                    }

                                    Button {
                                        showResetConfirmation = true
                                    } label: {
                                        Text(isDeleting ? "DELETING..." : "RESET ALL DATA")
                                    }
                                    .buttonStyle(.trunkDestructive)
                                    .disabled(isDeleting)
                                    .opacity(isDeleting ? 0.5 : 1)
                                }
                            }
                        }

                        // Sign out
                        Button {
                            Task {
                                try? await AuthService.shared.signOut()
                                dismiss()
                            }
                        } label: {
                            Text("SIGN OUT")
                                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                .foregroundStyle(Color.trunkDestructive)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, TrunkTheme.space3)
                                .background(Color.paper)
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.border, lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)
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
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .foregroundStyle(Color.ink)
                }
            }
            .confirmationDialog(
                "Are you sure you want to delete ALL your data?",
                isPresented: $showResetConfirmation,
                titleVisibility: .visible
            ) {
                Button("Delete Everything", role: .destructive) {
                    resetAllData()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will permanently remove all your sprouts, leaves, journal entries, and activity history. This action cannot be undone.")
            }
            .fileExporter(
                isPresented: $showExporter,
                document: exportDocument,
                contentType: .json,
                defaultFilename: exportFilename
            ) { result in
                exportDocument = nil
                if case .failure(let error) = result {
                    exportError = "Export failed: \(error.localizedDescription)"
                }
            }
            .fileImporter(
                isPresented: $showImporter,
                allowedContentTypes: [.json]
            ) { result in
                handleImportFile(result)
            }
            .confirmationDialog(
                "Import data?",
                isPresented: $showImportConfirmation,
                titleVisibility: .visible
            ) {
                Button("Import \(importPayload?.events.count ?? 0) events", role: .destructive) {
                    executeImport()
                }
                Button("Cancel", role: .cancel) {
                    importPayload = nil
                }
            } message: {
                Text("This will replace all your current data with the imported file. This action cannot be undone.")
            }
        }
        .onAppear {
            displayName = authService.userFullName ?? ""
            let currentTz = authService.userTimezone ?? TimeZone.current.identifier
            // Ensure timezone is in our list
            if Self.commonTimezones.contains(currentTz) {
                selectedTimezone = currentTz
            } else {
                selectedTimezone = TimeZone.current.identifier
            }
        }
    }

    // MARK: - Actions

    private func saveProfile() {
        isSaving = true
        saveMessage = nil
        let trimmedName = displayName.trimmingCharacters(in: .whitespacesAndNewlines)

        Task {
            do {
                try await AuthService.shared.updateProfile(
                    fullName: trimmedName,
                    timezone: selectedTimezone
                )
                saveMessage = "Saved"
                HapticManager.success()
                // Clear message after a moment
                try? await Task.sleep(for: .seconds(2))
                saveMessage = nil
            } catch {
                saveMessage = "Error — try again"
            }
            isSaving = false
        }
    }

    private func resetAllData() {
        isDeleting = true
        deleteError = nil

        Task {
            do {
                try await SyncService.shared.deleteAllEvents()
                HapticManager.impact()
                progression.refresh()
                dismiss()
            } catch {
                deleteError = "Failed to delete: \(error.localizedDescription)"
            }
            isDeleting = false
        }
    }

    // MARK: - Export / Import

    private var exportFilename: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        return "trunk-\(formatter.string(from: Date())).json"
    }

    private func exportData() {
        exportError = nil
        let events = EventStore.shared.events
        let payload = DataExportService.generateExport(events: events)
        do {
            let data = try DataExportService.exportToJSON(payload)
            exportDocument = TrunkExportDocument(data: data)
            showExporter = true
        } catch {
            exportError = "Export failed: \(error.localizedDescription)"
        }
    }

    private func handleImportFile(_ result: Result<URL, Error>) {
        importError = nil
        switch result {
        case .success(let url):
            do {
                guard url.startAccessingSecurityScopedResource() else {
                    importError = "Cannot access file"
                    return
                }
                defer { url.stopAccessingSecurityScopedResource() }
                let data = try Data(contentsOf: url)
                let payload = try DataExportService.parseImport(data)
                importPayload = payload
                showImportConfirmation = true
            } catch {
                importError = "Invalid file: \(error.localizedDescription)"
            }
        case .failure(let error):
            importError = "Failed to open file: \(error.localizedDescription)"
        }
    }

    private func executeImport() {
        guard let payload = importPayload else { return }
        guard let userId = authService.user?.id else {
            importError = "Not authenticated"
            return
        }
        isImporting = true
        importError = nil

        Task {
            do {
                let inserts = payload.events.enumerated().map { index, event in
                    SyncEventInsert(
                        userId: userId.uuidString,
                        type: event.type.rawValue,
                        payload: trunkEventToPayload(event),
                        clientId: "\(event.timestamp)-import-\(index)",
                        clientTimestamp: event.timestamp
                    )
                }

                try await SyncService.shared.importEvents(inserts)
                progression.refresh()
                HapticManager.success()
            } catch {
                importError = "Import failed: \(error.localizedDescription)"
            }
            isImporting = false
            importPayload = nil
        }
    }

    private func trunkEventToPayload(_ event: TrunkEvent) -> [String: JSONValue] {
        var payload: [String: JSONValue] = [:]
        if let v = event.sproutId { payload["sproutId"] = .string(v) }
        if let v = event.twigId { payload["twigId"] = .string(v) }
        if let v = event.title { payload["title"] = .string(v) }
        if let v = event.season { payload["season"] = .string(v) }
        if let v = event.environment { payload["environment"] = .string(v) }
        if let v = event.soilCost { payload["soilCost"] = .double(v) }
        if let v = event.leafId { payload["leafId"] = .string(v) }
        if let v = event.bloomWither { payload["bloomWither"] = .string(v) }
        if let v = event.bloomBudding { payload["bloomBudding"] = .string(v) }
        if let v = event.bloomFlourish { payload["bloomFlourish"] = .string(v) }
        if let v = event.content { payload["content"] = .string(v) }
        if let v = event.prompt { payload["prompt"] = .string(v) }
        if let v = event.result { payload["result"] = .int(v) }
        if let v = event.reflection { payload["reflection"] = .string(v) }
        if let v = event.capacityGained { payload["capacityGained"] = .double(v) }
        if let v = event.soilReturned { payload["soilReturned"] = .double(v) }
        if let v = event.twigLabel { payload["twigLabel"] = .string(v) }
        if let v = event.name { payload["name"] = .string(v) }
        return payload
    }

    // MARK: - Helpers

    private func settingsCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(TrunkTheme.space3)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
    }

    private func settingsRow(label: String, value: String) -> some View {
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

    // MARK: - Timezone Data

    private static let commonTimezones = [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Anchorage",
        "Pacific/Honolulu",
        "America/Toronto",
        "America/Vancouver",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Europe/Moscow",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Asia/Singapore",
        "Asia/Dubai",
        "Australia/Sydney",
        "Australia/Melbourne",
        "Pacific/Auckland",
    ]

    private static func formatTimezone(_ tz: String) -> String {
        let city = tz.split(separator: "/").last.map { String($0).replacingOccurrences(of: "_", with: " ") } ?? tz
        let abbreviation = TimeZone(identifier: tz)?.abbreviation() ?? ""
        return abbreviation.isEmpty ? city : "\(city) (\(abbreviation))"
    }
}

#Preview {
    SettingsView(progression: ProgressionViewModel())
        .environment(AuthService.shared)
}
