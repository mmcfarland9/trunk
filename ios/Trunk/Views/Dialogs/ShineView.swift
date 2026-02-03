//
//  ShineView.swift
//  Trunk
//
//  Weekly reflection dialog for the shine/sun feature.
//

import SwiftUI
import SwiftData

struct ShineView: View {
    @Bindable var progression: ProgressionViewModel

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var reflection = ""
    @State private var selectedTwig: TwigContext?
    @State private var selectedPrompt: String = ""
    @State private var isShining = false
    @FocusState private var isReflectionFocused: Bool

    private var hasReflection: Bool {
        !reflection.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            if let twig = selectedTwig {
                ScrollView {
                    VStack(alignment: .leading, spacing: TrunkTheme.space5) {
                        // Twig display
                        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                            Text(twig.label.uppercased())
                                .font(.system(size: TrunkTheme.textLg, design: .monospaced))
                                .fontWeight(.medium)
                                .foregroundStyle(Color.ink)

                            Text(twig.branchName)
                                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)
                        }

                        // Prompt
                        Text("\"\(selectedPrompt)\"")
                            .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                            .italic()
                            .foregroundStyle(Color.inkLight)
                            .padding(TrunkTheme.space3)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.paper)
                            .overlay(
                                Rectangle()
                                    .stroke(Color.border, lineWidth: 1)
                            )

                        // Reflection text field
                        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
                            Text("YOUR REFLECTION")
                                .monoLabel(size: TrunkTheme.textXs)

                            TextField("Write your thoughts...", text: $reflection, axis: .vertical)
                                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                                .foregroundStyle(Color.ink)
                                .lineLimit(4...8)
                                .padding(TrunkTheme.space3)
                                .background(Color.paper)
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.border, lineWidth: 1)
                                )
                                .focused($isReflectionFocused)
                        }

                        // Soil recovery info
                        HStack {
                            Text("SOIL RECOVERY")
                                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                                .foregroundStyle(Color.inkFaint)

                            Spacer()

                            Text("+\(String(format: "%.2f", ProgressionService.sunRecovery))")
                                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                                .foregroundStyle(Color.trunkSun)
                        }
                        .padding(TrunkTheme.space3)
                        .background(Color.paper)
                        .overlay(
                            Rectangle()
                                .stroke(Color.border, lineWidth: 1)
                        )

                        // Action button
                        Button {
                            performShine(twig: twig)
                        } label: {
                            HStack(spacing: 4) {
                                Text("☀️")
                                Text("SHINE")
                            }
                        }
                        .buttonStyle(.trunkSun)
                        .disabled(!hasReflection || isShining)
                        .opacity(!hasReflection || isShining ? 0.5 : 1)
                        .pulse(hasReflection && !isShining)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    .padding(TrunkTheme.space4)
                }
            } else {
                // Loading state - should select immediately
                ProgressView()
                    .padding(TrunkTheme.space4)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
                .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
            }
            ToolbarItem(placement: .principal) {
                Text("WEEKLY REFLECTION")
                    .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.trunkSun)
            }
        }
        .onAppear {
            selectRandomTwig()
            isReflectionFocused = true
        }
    }

    /// Select a random twig from all 64 twigs (equal odds)
    private func selectRandomTwig() {
        // Generate all 64 twig candidates using SharedConstants
        var candidates: [TwigContext] = []
        for branchIndex in 0..<SharedConstants.Tree.branchCount {
            for twigIndex in 0..<SharedConstants.Tree.twigCount {
                let twigLabel = SharedConstants.Tree.twigLabel(branchIndex: branchIndex, twigIndex: twigIndex)
                let branchName = SharedConstants.Tree.branchName(branchIndex)
                let nodeId = "branch-\(branchIndex)-twig-\(twigIndex)"

                candidates.append(TwigContext(
                    nodeId: nodeId,
                    label: twigLabel.capitalized,
                    branchName: branchName
                ))
            }
        }

        // Select random twig and generate prompt with twig label
        if let twig = candidates.randomElement() {
            selectedTwig = twig
            selectedPrompt = SunPrompts.randomPrompt(twigLabel: twig.label)
        }
    }

    private func performShine(twig: TwigContext) {
        isShining = true
        HapticManager.tap()

        let content = reflection.trimmingCharacters(in: .whitespacesAndNewlines)
        let timestamp = ISO8601DateFormatter().string(from: Date())

        // Push to cloud - state will derive automatically from events
        Task {
            try? await SyncService.shared.pushEvent(type: "sun_shone", payload: [
                "twigId": twig.nodeId,
                "twigLabel": twig.label,
                "note": content,
                "prompt": selectedPrompt,
                "timestamp": timestamp
            ])
        }

        // Success haptic and dismiss with slight delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            HapticManager.success()
            dismiss()
        }
    }

}

// MARK: - TwigContext

/// Simple context for a selected twig (one of 64 life facets)
struct TwigContext {
    let nodeId: String
    let label: String
    let branchName: String
}

#Preview {
    NavigationStack {
        ShineView(progression: ProgressionViewModel())
    }
    .modelContainer(for: [Sprout.self, WaterEntry.self, Leaf.self, NodeData.self, SunEntry.self], inMemory: true)
}
