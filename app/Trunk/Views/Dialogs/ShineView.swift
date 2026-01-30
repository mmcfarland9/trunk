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
    @FocusState private var isReflectionFocused: Bool

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
                        Button("SHINE") {
                            performShine(twig: twig)
                        }
                        .buttonStyle(.trunkSun)
                        .disabled(reflection.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .opacity(reflection.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1)
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
        let branchNames = ["Core", "Brain", "Voice", "Hands", "Heart", "Breath", "Back", "Feet"]

        // Generate all 64 twig candidates
        var candidates: [TwigContext] = []
        for branchIndex in 0..<8 {
            for twigIndex in 0..<8 {
                let twigLabel = defaultTwigLabels[branchIndex]?[twigIndex] ?? "Twig"
                let branchName = branchNames[branchIndex]
                let nodeId = "branch-\(branchIndex)-twig-\(twigIndex)"

                candidates.append(TwigContext(
                    nodeId: nodeId,
                    label: twigLabel,
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
        // Create SunEntry (twig-only)
        let entry = SunEntry(
            content: reflection.trimmingCharacters(in: .whitespacesAndNewlines),
            prompt: selectedPrompt,
            twigId: twig.nodeId,
            twigLabel: twig.label
        )
        modelContext.insert(entry)

        // Use sun resource (decrements sun, adds soil recovery)
        progression.useSun()

        dismiss()
    }

    private var defaultTwigLabels: [Int: [Int: String]] {
        [
            0: [0: "Movement", 1: "Strength", 2: "Sport", 3: "Technique", 4: "Maintenance", 5: "Nutrition", 6: "Sleep", 7: "Appearance"],
            1: [0: "Reading", 1: "Writing", 2: "Reasoning", 3: "Focus", 4: "Memory", 5: "Analysis", 6: "Dialogue", 7: "Exploration"],
            2: [0: "Practice", 1: "Composition", 2: "Interpretation", 3: "Performance", 4: "Consumption", 5: "Curation", 6: "Completion", 7: "Publication"],
            3: [0: "Design", 1: "Fabrication", 2: "Assembly", 3: "Repair", 4: "Refinement", 5: "Tooling", 6: "Tending", 7: "Preparation"],
            4: [0: "Homemaking", 1: "Care", 2: "Presence", 3: "Intimacy", 4: "Communication", 5: "Ritual", 6: "Adventure", 7: "Joy"],
            5: [0: "Observation", 1: "Nature", 2: "Flow", 3: "Repose", 4: "Idleness", 5: "Exposure", 6: "Abstinence", 7: "Reflection"],
            6: [0: "Connection", 1: "Support", 2: "Gathering", 3: "Membership", 4: "Stewardship", 5: "Advocacy", 6: "Service", 7: "Culture"],
            7: [0: "Work", 1: "Development", 2: "Positioning", 3: "Ventures", 4: "Finance", 5: "Operations", 6: "Planning", 7: "Administration"]
        ]
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
