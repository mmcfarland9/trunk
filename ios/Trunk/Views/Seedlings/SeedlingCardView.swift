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
    let onEdit: (String) -> Void
    let onDelete: () -> Void

    @State private var isEditing = false
    @State private var editTitle: String = ""

    var body: some View {
        HStack(spacing: 8) {
            if isEditing {
                TextField("Title", text: $editTitle)
                    .textFieldStyle(.roundedBorder)
                    .font(.subheadline)
                    .onSubmit {
                        commitEdit()
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
        let trimmed = editTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty, trimmed != seedling.title {
            onEdit(trimmed)
        }
        isEditing = false
    }
}
