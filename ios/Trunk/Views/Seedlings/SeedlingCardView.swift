//
//  SeedlingCardView.swift
//  Trunk
//
//  A compact card for a seedling idea.
//

import SwiftUI

struct SeedlingCardView: View {
    let seedling: DerivedSeedling
    let onPlant: () -> Void
    let onEdit: (String, String?) -> Void
    let onDelete: () -> Void

    @State private var isEditing = false
    @State private var editTitle: String = ""
    @State private var editNotes: String = ""

    var body: some View {
        HStack(spacing: 8) {
            if isEditing {
                VStack(spacing: 4) {
                    TextField("Title", text: $editTitle)
                        .textFieldStyle(.roundedBorder)
                        .font(.subheadline)
                        .onSubmit {
                            commitEdit()
                        }
                        .onChange(of: editTitle) { _, newValue in
                            if newValue.count > SharedConstants.Validation.maxSeedlingTitleLength {
                                editTitle = String(newValue.prefix(SharedConstants.Validation.maxSeedlingTitleLength))
                            }
                        }
                    TextField("Notes (optional)", text: $editNotes)
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                        .onSubmit {
                            commitEdit()
                        }
                        .onChange(of: editNotes) { _, newValue in
                            if newValue.count > SharedConstants.Validation.maxSeedlingNotesLength {
                                editNotes = String(newValue.prefix(SharedConstants.Validation.maxSeedlingNotesLength))
                            }
                        }
                }
                Button("Done") {
                    commitEdit()
                }
                .font(.caption)
            } else {
                VStack(alignment: .leading, spacing: 2) {
                    Text(seedling.title)
                        .font(.subheadline)
                        .lineLimit(1)
                    if let notes = seedling.notes {
                        Text(notes)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                Button("Set") {
                    onPlant()
                }
                .font(.caption)
                .buttonStyle(.bordered)
                .tint(.green)
            }
        }
        .padding(.vertical, 4)
        .contextMenu {
            Button {
                editTitle = seedling.title
                editNotes = seedling.notes ?? ""
                isEditing = true
            } label: {
                Label("Edit", systemImage: "pencil")
            }
            Button("Set as Sprout") {
                onPlant()
            }
            Button(role: .destructive) {
                onDelete()
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                onDelete()
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    private func commitEdit() {
        let trimmedTitle = String(editTitle.trimmingCharacters(in: .whitespacesAndNewlines)
            .prefix(SharedConstants.Validation.maxSeedlingTitleLength))
        let trimmedNotes = String(editNotes.trimmingCharacters(in: .whitespacesAndNewlines)
            .prefix(SharedConstants.Validation.maxSeedlingNotesLength))
        let notesChanged = trimmedNotes != (seedling.notes?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "")
        if !trimmedTitle.isEmpty, trimmedTitle != seedling.title || notesChanged {
            onEdit(trimmedTitle, trimmedNotes.isEmpty ? "" : trimmedNotes)
        }
        isEditing = false
    }
}
