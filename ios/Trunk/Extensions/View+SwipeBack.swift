//
//  View+SwipeBack.swift
//  Trunk
//
//  Re-enables the interactive pop gesture when the system back button is hidden.
//

import SwiftUI
import UIKit

extension View {
    /// Allow left-edge swipe to pop even with a custom back button.
    func swipeBackEnabled() -> some View {
        background {
            SwipeBackHelper()
        }
    }
}

private struct SwipeBackHelper: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> SwipeBackViewController {
        SwipeBackViewController()
    }

    func updateUIViewController(_ uiViewController: SwipeBackViewController, context: Context) {}
}

final class SwipeBackViewController: UIViewController {
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        navigationController?.interactivePopGestureRecognizer?.isEnabled = true
        navigationController?.interactivePopGestureRecognizer?.delegate = nil
    }
}
