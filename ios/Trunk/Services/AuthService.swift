//
//  AuthService.swift
//  Trunk
//
//  Authentication service with email OTP via Supabase.
//

import Foundation
import Supabase
import Auth

@MainActor
@Observable
final class AuthService {
    static let shared = AuthService()

    private(set) var user: Auth.User?
    private(set) var session: Auth.Session?
    private(set) var isLoading = true

    var isAuthenticated: Bool {
        user != nil
    }

    private init() {}

    func initialize() async {
        guard let client = SupabaseClientProvider.shared else {
            isLoading = false
            return
        }

        do {
            session = try await client.auth.session
            user = session?.user
        } catch {
            print("Failed to get session: \(error)")
        }

        isLoading = false

        // Listen for auth changes
        Task {
            for await (_, session) in client.auth.authStateChanges {
                self.session = session
                self.user = session?.user
            }
        }
    }

    func requestCode(email: String) async throws {
        guard let client = SupabaseClientProvider.shared else {
            throw AuthError.notConfigured
        }

        try await client.auth.signInWithOTP(
            email: email,
            shouldCreateUser: true
        )
    }

    func verifyCode(email: String, code: String) async throws {
        guard let client = SupabaseClientProvider.shared else {
            throw AuthError.notConfigured
        }

        try await client.auth.verifyOTP(
            email: email,
            token: code,
            type: .email
        )
    }

    func signOut() async throws {
        guard let client = SupabaseClientProvider.shared else { return }
        try await client.auth.signOut()
    }
}

enum AuthError: LocalizedError {
    case notConfigured

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Supabase is not configured"
        }
    }
}
