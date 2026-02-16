//
//  SoilChartView.swift
//  Trunk
//
//  Soil capacity chart with scrubbing gesture and time range selection.
//

import SwiftUI
import Charts

struct SoilChartView: View {
    let rawHistory: [RawSoilSnapshot]

    @Binding var selectedRange: SoilChartRange
    @State private var scrubIndex: Int? = nil

    private var filteredSoilHistory: [SoilChartPoint] {
        SoilHistoryService.bucketSoilHistory(rawHistory, range: selectedRange, now: Date())
    }

    var body: some View {
        let points = filteredSoilHistory

        return VStack(alignment: .leading, spacing: TrunkTheme.space2) {
            // Title + Legend (or scrub data label when active)
            HStack(alignment: .center) {
                if let idx = scrubIndex, idx < points.count {
                    let pt = points[idx]
                    scrubLabel(point: pt)
                } else {
                    Text("SOIL")
                        .monoLabel(size: TrunkTheme.textXs)

                    Spacer()

                    HStack(spacing: TrunkTheme.space3) {
                        legendItem(color: Color.twig, label: "Capacity")
                        legendItem(color: Color.trunkSuccess, label: "Available")
                    }
                }
            }
            .animation(.none, value: scrubIndex)

            if points.count < 2 {
                Text("Harvest sprouts to grow capacity")
                    .font(.system(size: TrunkTheme.textSm, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
                    .padding(.vertical, TrunkTheme.space3)
            } else {
                chartView(points: points)
            }

            // Time range picker
            soilRangePicker
        }
        .padding(TrunkTheme.space3)
        .background(Color.paper)
        .overlay(
            Rectangle()
                .stroke(Color.border, lineWidth: 1)
        )
    }

    // MARK: - Chart

    private func chartView(points: [SoilChartPoint]) -> some View {
        let maxCapacity = points.map(\.capacity).max() ?? 15
        let selectedDate = (scrubIndex != nil && scrubIndex! < points.count) ? points[scrubIndex!].date : nil

        return Chart {
            ForEach(Array(points.enumerated()), id: \.offset) { index, point in
                // Capacity line with subtle fill
                LineMark(
                    x: .value("Date", point.date),
                    y: .value("Value", point.capacity),
                    series: .value("Series", "Capacity")
                )
                .foregroundStyle(Color.twig)
                .interpolationMethod(.stepEnd)

                AreaMark(
                    x: .value("Date", point.date),
                    y: .value("Value", point.capacity),
                    series: .value("Series", "Capacity")
                )
                .foregroundStyle(Color.twig.opacity(0.06))
                .interpolationMethod(.stepEnd)

                // Available line (no area fill to prevent overlap)
                LineMark(
                    x: .value("Date", point.date),
                    y: .value("Value", point.available),
                    series: .value("Series", "Available")
                )
                .foregroundStyle(Color.trunkSuccess)
                .interpolationMethod(.stepEnd)
                .lineStyle(StrokeStyle(lineWidth: 2))

                // Data nodes — small dots at each point
                PointMark(
                    x: .value("Date", point.date),
                    y: .value("Value", point.capacity)
                )
                .foregroundStyle(Color.twig)
                .symbolSize(index == scrubIndex ? 30 : 12)

                PointMark(
                    x: .value("Date", point.date),
                    y: .value("Value", point.available)
                )
                .foregroundStyle(Color.trunkSuccess)
                .symbolSize(index == scrubIndex ? 30 : 12)
            }

            // Scrub rule line (inside chart for proper coordinate alignment)
            if let date = selectedDate {
                RuleMark(x: .value("Scrub", date))
                    .foregroundStyle(Color.inkFaint.opacity(0.4))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 3]))
            }
        }
        // Scrub gesture
        .chartOverlay { proxy in
            GeometryReader { geo in
                Rectangle()
                    .fill(Color.clear)
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { value in
                                let xPos = value.location.x
                                guard let date: Date = proxy.value(atX: xPos) else { return }
                                let newIndex = closestPointIndex(to: date, in: points)
                                if newIndex != scrubIndex {
                                    if scrubIndex == nil {
                                        HapticManager.tap()
                                    } else {
                                        HapticManager.selection()
                                    }
                                    scrubIndex = newIndex
                                }
                            }
                            .onEnded { _ in
                                scrubIndex = nil
                            }
                    )
            }
        }
        .chartYScale(domain: 0 ... max(maxCapacity, 15))
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                AxisGridLine()
                    .foregroundStyle(Color.border)
                AxisValueLabel()
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }
        }
        .chartYAxis {
            AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                AxisGridLine()
                    .foregroundStyle(Color.border)
                AxisValueLabel()
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkFaint)
            }
        }
        .chartXScale(domain: (points.first?.date ?? Date()) ... Date())
        .chartForegroundStyleScale([
            "Capacity": Color.twig,
            "Available": Color.trunkSuccess
        ])
        .chartLegend(.hidden)
        .frame(height: 140)
        .id(selectedRange)
    }

    // MARK: - Scrub Label

    private static let scrubDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy h:mm a"
        return f
    }()

    private func scrubLabel(point: SoilChartPoint) -> some View {
        return HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text(Self.scrubDateFormatter.string(from: point.date))
                    .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                    .foregroundStyle(Color.inkLight)
            }

            Spacer()

            HStack(spacing: TrunkTheme.space3) {
                HStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.twig)
                        .frame(width: 8, height: 2)
                    Text(String(format: "%.2f", point.capacity))
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.twig)
                }
                HStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.trunkSuccess)
                        .frame(width: 8, height: 2)
                    Text(String(format: "%.2f", point.available))
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(Color.trunkSuccess)
                }
            }
        }
    }

    // MARK: - Helpers

    private func closestPointIndex(to date: Date, in points: [SoilChartPoint]) -> Int? {
        guard !points.isEmpty else { return nil }
        var bestIndex = 0
        var bestDistance = abs(date.timeIntervalSince(points[0].date))
        for i in 1..<points.count {
            let distance = abs(date.timeIntervalSince(points[i].date))
            if distance < bestDistance {
                bestDistance = distance
                bestIndex = i
            }
        }
        return bestIndex
    }

    private func legendItem(color: Color, label: String) -> some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 1)
                .fill(color)
                .frame(width: 12, height: 2)
            Text(label)
                .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                .foregroundStyle(Color.inkFaint)
        }
    }

    private func isRangeAvailable(_ range: SoilChartRange) -> Bool {
        guard let rangeStart = range.startDate,
              let earliest = rawHistory.first?.date else {
            return true // ALL is always available; no data = nothing to disable
        }
        return earliest <= rangeStart
    }

    // MARK: - Range Picker

    private var soilRangePicker: some View {
        HStack(spacing: 0) {
            ForEach(SoilChartRange.allCases, id: \.self) { range in
                let available = isRangeAvailable(range)
                Button {
                    scrubIndex = nil
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedRange = range
                    }
                } label: {
                    Text(range.rawValue)
                        .font(.system(size: TrunkTheme.textXs, design: .monospaced))
                        .foregroundStyle(
                            !available ? Color.inkFaint.opacity(0.35)
                            : selectedRange == range ? Color.ink
                            : Color.inkFaint
                        )
                        .padding(.horizontal, 6)
                        .padding(.vertical, 4)
                        .background(
                            selectedRange == range && available
                                ? Color.border
                                : Color.clear
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                }
                .buttonStyle(.plain)
                .disabled(!available)

                if range != SoilChartRange.allCases.last {
                    Spacer(minLength: 0)
                }
            }
        }
    }
}
