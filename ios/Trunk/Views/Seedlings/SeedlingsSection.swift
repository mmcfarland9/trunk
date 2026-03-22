//
//  SeedlingsSection.swift
//  Trunk
//
//  A section displaying seedlings for a twig, with add capability.
//

import SwiftUI

struct SeedlingsSection: View {
    let twigId: String
    let seedlings: [DerivedSeedling]
    let onPlant: (DerivedSeedling) -> Void
    let onRefresh: () -> Void

    @State private var newSeedlingTitle = ""

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            Text("SEEDLINGS (\(seedlings.count))")
                .monoLabel(size: TrunkTheme.textXs)

            VStack(spacing: 1) {
                ForEach(seedlings) { seedling in
                    SeedlingCardView(
                        seedling: seedling,
                        onPlant: { onPlant(seedling) },
                        onEdit: { newTitle in
                            editSeedling(seedling.id, title: newTitle)
                        },
                        onDelete: {
                            deleteSeedling(seedling.id)
                        }
                    )
                    .padding(.horizontal, TrunkTheme.space3)
                }

                // Add seedling input
                HStack(spacing: TrunkTheme.space2) {
                    TextField("Add a seedling idea...", text: $newSeedlingTitle)
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .textFieldStyle(.plain)
                        .onSubmit { addSeedling() }

                    Button {
                        addSeedling()
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundStyle(Color.wood)
                    }
                    .disabled(newSeedlingTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding(.horizontal, TrunkTheme.space3)
                .padding(.vertical, TrunkTheme.space2)
            }
            .background(Color.paper)
            .overlay(
                Rectangle()
                    .stroke(Color.border, lineWidth: 1)
            )
        }
    }

    private func addSeedling() {
        let title = newSeedlingTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return }
        let seedlingId = "seedling-\(UUID().uuidString.lowercased())"
        Task {
            do {
                try await SyncService.shared.pushEvent(
                    type: "seedling_created",
                    payload: [
                        "seedlingId": .string(seedlingId),
                        "twigId": .string(twigId),
                        "title": .string(title),
                    ]
                )
            } catch {
                // biome-ignore: intentional error logging
                print("[SeedlingsSection] Failed to create seedling: \(error)")
            }
            newSeedlingTitle = ""
            onRefresh()
        }
    }

    private func editSeedling(_ seedlingId: String, title: String) {
        Task {
            do {
                try await SyncService.shared.pushEvent(
                    type: "seedling_edited",
                    payload: [
                        "seedlingId": .string(seedlingId),
                        "title": .string(title),
                    ]
                )
            } catch {
                print("[SeedlingsSection] Failed to edit seedling: \(error)")
            }
            onRefresh()
        }
    }

    private func deleteSeedling(_ seedlingId: String) {
        Task {
            do {
                try await SyncService.shared.pushEvent(
                    type: "seedling_deleted",
                    payload: [
                        "seedlingId": .string(seedlingId),
                    ]
                )
            } catch {
                print("[SeedlingsSection] Failed to delete seedling: \(error)")
            }
            onRefresh()
        }
    }
}
