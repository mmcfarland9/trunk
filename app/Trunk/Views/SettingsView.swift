//
//  SettingsView.swift
//  Trunk
//
//  App settings, history logs, and data management.
//

import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct SettingsView: View {
    @Bindable var progression: ProgressionViewModel

    @Environment(\.modelContext) private var modelContext
    @Query private var sprouts: [Sprout]
    @Query private var leaves: [Leaf]
    @Query private var sunEntries: [SunEntry]
    @Query private var nodeData: [NodeData]

    @State private var showingExportSheet = false
    @State private var showingImportPicker = false
    @State private var showingImportConfirm = false
    @State private var exportURL: URL?
    @State private var importPayload: ExportPayload?
    @State private var alertMessage = ""
    @State private var showingAlert = false

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TrunkTheme.space5) {
                    // History section
                    historySection

                    // Data section
                    dataSection

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

                    Text("\(sprouts.count)")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }
                .padding(TrunkTheme.space3)

                HStack {
                    Text("Total Leaves")
                        .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                        .foregroundStyle(Color.ink)

                    Spacer()

                    Text("\(leaves.count)")
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
        let payload = DataExportService.generateExport(
            sprouts: sprouts,
            leaves: leaves,
            sunEntries: sunEntries,
            nodeData: nodeData,
            soilCapacity: progression.soilCapacity
        )

        do {
            let jsonData = try DataExportService.exportToJSON(payload)

            // Create temp file for sharing
            let timestamp = ISO8601DateFormatter().string(from: Date())
                .replacingOccurrences(of: ":", with: "")
                .replacingOccurrences(of: "-", with: "")
            let filename = "trunk\(timestamp).json"
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)

            try jsonData.write(to: tempURL)
            exportURL = tempURL
            showingExportSheet = true

        } catch {
            alertMessage = "Export failed: \(error.localizedDescription)"
            showingAlert = true
        }
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

        // Delete existing data
        for sprout in sprouts {
            modelContext.delete(sprout)
        }
        for leaf in leaves {
            modelContext.delete(leaf)
        }
        for entry in sunEntries {
            modelContext.delete(entry)
        }
        for node in nodeData {
            modelContext.delete(node)
        }

        // Rebuild from events
        let result = DataExportService.rebuildFromEvents(
            payload.events,
            circles: payload.circles,
            context: modelContext
        )

        // Insert new data
        for sprout in result.sprouts {
            modelContext.insert(sprout)
        }
        for leaf in result.leaves {
            modelContext.insert(leaf)
        }
        for entry in result.sunEntries {
            modelContext.insert(entry)
        }
        for node in result.nodeData {
            modelContext.insert(node)
        }

        // Save
        try? modelContext.save()

        importPayload = nil
        alertMessage = "Imported \(result.sprouts.count) sprouts, \(result.leaves.count) leaves, and \(result.sunEntries.count) sun entries."
        showingAlert = true
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
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
