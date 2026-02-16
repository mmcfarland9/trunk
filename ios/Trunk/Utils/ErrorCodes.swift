//
//  ErrorCodes.swift
//  Trunk
//
//  Error code registry loader for cross-platform error messaging.
//  Loads shared/error-codes.json from the app bundle.
//

import Foundation

/// Error information matching the shared error-codes.json structure
struct ErrorInfo: Codable {
    let code: String
    let defaultMessage: String
    let userMessage: String
}

/// Error code registry loaded from shared/error-codes.json
final class ErrorCodes {
    static let shared = ErrorCodes()

    private var registry: [String: [String: ErrorInfo]] = [:]

    private init() {
        loadRegistry()
    }

    /// Load error codes from the app bundle
    private func loadRegistry() {
        // Try to load from bundle (shared/error-codes.json should be included in build)
        guard let url = Bundle.main.url(forResource: "error-codes", withExtension: "json", subdirectory: "shared") else {
            print("ErrorCodes: error-codes.json not found in bundle")
            return
        }

        do {
            let data = try Data(contentsOf: url)
            let decoded = try JSONDecoder().decode([String: [String: ErrorInfo]].self, from: data)
            registry = decoded
        } catch {
            print("ErrorCodes: Failed to load error-codes.json - \(error)")
        }
    }

    /// Get error info for a specific error key within a category
    /// - Parameters:
    ///   - category: The error category (e.g., "auth", "sync", "validation")
    ///   - errorKey: The specific error key (e.g., "NOT_CONFIGURED")
    /// - Returns: The error info object with code, defaultMessage, and userMessage
    func getErrorInfo(category: String, errorKey: String) -> ErrorInfo {
        guard let categoryErrors = registry[category],
              let errorInfo = categoryErrors[errorKey] else {
            return ErrorInfo(
                code: "UNKNOWN",
                defaultMessage: "An unknown error occurred",
                userMessage: "Something went wrong. Please try again."
            )
        }
        return errorInfo
    }

    /// Get the user-facing message for an error
    /// - Parameters:
    ///   - category: The error category (e.g., "auth", "sync", "validation")
    ///   - errorKey: The specific error key (e.g., "NOT_CONFIGURED")
    /// - Returns: The user-friendly error message
    func getUserMessage(category: String, errorKey: String) -> String {
        return getErrorInfo(category: category, errorKey: errorKey).userMessage
    }

    /// Get the error code for an error
    /// - Parameters:
    ///   - category: The error category (e.g., "auth", "sync", "validation")
    ///   - errorKey: The specific error key (e.g., "NOT_CONFIGURED")
    /// - Returns: The error code (e.g., "AUTH_001")
    func getErrorCode(category: String, errorKey: String) -> String {
        return getErrorInfo(category: category, errorKey: errorKey).code
    }

    /// Static convenience method for getting user messages
    static func getUserMessage(category: String, errorKey: String) -> String {
        return shared.getUserMessage(category: category, errorKey: errorKey)
    }
}
