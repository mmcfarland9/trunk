//
//  TwigIdParser.swift
//  Trunk
//
//  Shared utility for parsing twig IDs like "branch-0-twig-3".
//

import Foundation

struct TwigIdComponents {
    let branchIndex: Int
    let twigIndex: Int
}

/// Parse a twig ID string (e.g. "branch-0-twig-3") into its branch and twig indices.
func parseTwigId(_ twigId: String) -> TwigIdComponents? {
    let parts = twigId.split(separator: "-")
    guard parts.count >= 4,
          let branchIndex = Int(parts[1]),
          let twigIndex = Int(parts[3]) else {
        return nil
    }
    return TwigIdComponents(branchIndex: branchIndex, twigIndex: twigIndex)
}

/// Get a human-readable location label for a twig ID (e.g. "CORE / Movement").
func twigLocationLabel(for twigId: String) -> String {
    guard let components = parseTwigId(twigId) else { return twigId }
    let branchName = SharedConstants.Tree.branchName(components.branchIndex)
    let twigLabel = SharedConstants.Tree.twigLabel(branchIndex: components.branchIndex, twigIndex: components.twigIndex)
    return "\(branchName) / \(twigLabel.capitalized)"
}
