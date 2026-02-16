//
//  SproutFilterBar.swift
//  Trunk
//
//  Search, filter, and sort controls for sprouts.
//

import SwiftUI

enum SproutFilter: String, CaseIterable {
    case all = "All"
    case active = "Active"
    case completed = "Completed"
    case uprooted = "Uprooted"
}

enum SproutSort: String, CaseIterable {
    case planted = "Planted"
    case alphabetical = "A-Z"
    case status = "Status"
}

struct SproutFilterBar: View {
    @Bindable var viewModel: SproutsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space4) {
            // Search
            searchBar
                .animatedCard(index: 1)

            // Filters and sort
            filtersSection
                .animatedCard(index: 2)
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: TrunkTheme.space2) {
            Text("?")
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.inkFaint)

            TextField("Search sprouts...", text: $viewModel.searchText)
                .font(.system(size: TrunkTheme.textBase, design: .monospaced))
                .foregroundStyle(Color.ink)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)

            if !viewModel.searchText.isEmpty {
                Button {
                    viewModel.searchText = ""
                } label: {
                    Text("x")
                        .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                        .foregroundStyle(Color.inkFaint)
                }
            }
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }

    // MARK: - Filters

    private var filtersSection: some View {
        VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            // Status filter
            HStack(spacing: TrunkTheme.space1) {
                ForEach(SproutFilter.allCases, id: \.self) { filter in
                    Button {
                        HapticManager.tap()
                        viewModel.selectedFilter = filter
                    } label: {
                        Text(filter.rawValue)
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(viewModel.selectedFilter == filter ? Color.wood : Color.inkFaint)
                            .padding(.horizontal, TrunkTheme.space2)
                            .padding(.vertical, TrunkTheme.space1)
                            .background(viewModel.selectedFilter == filter ? Color.wood.opacity(0.08) : Color.clear)
                            .overlay(
                                Rectangle()
                                    .stroke(viewModel.selectedFilter == filter ? Color.wood : Color.border, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }

                Spacer()

                // Sort control
                Menu {
                    ForEach(SproutSort.allCases, id: \.self) { sort in
                        Button {
                            viewModel.selectedSort = sort
                        } label: {
                            HStack {
                                Text(sort.rawValue)
                                if viewModel.selectedSort == sort {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack(spacing: TrunkTheme.space1) {
                        Text("Sort: \(viewModel.selectedSort.rawValue)")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)

                        Text("\u{25BE}")
                            .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                            .foregroundStyle(Color.inkFaint)
                    }
                    .padding(.horizontal, TrunkTheme.space2)
                    .padding(.vertical, TrunkTheme.space1)
                    .overlay(
                        Rectangle()
                            .stroke(Color.border, lineWidth: 1)
                    )
                }
            }
        }
    }
}
