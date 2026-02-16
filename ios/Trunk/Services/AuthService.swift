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
    private(set) var userFullName: String?

    var isAuthenticated: Bool {
        user != nil
    }

    private init() {}

    func initialize() async {
        guard let client = SupabaseClientProvider.shared else {
            isLoading = false
            return
        }

        // Maestro E2E test auth: sign in with password via launch arguments.
        // Password is compiled into debug builds only — Maestro just passes testAuth + testEmail.
        #if DEBUG
        let defaults = UserDefaults.standard
        if defaults.bool(forKey: "testAuth") {
            let email = defaults.string(forKey: "testEmail") ?? ""
            let testPassword = "trunk-e2e-test-2026!"
            if !email.isEmpty {
                do {
                    let authSession = try await client.auth.signIn(email: email, password: testPassword)
                    self.session = authSession
                    self.user = authSession.user
                    await fetchProfile()
                } catch {
                    print("[TestAuth] Password sign-in failed: \(error)")
                }
                isLoading = false
                return
            }
        }
        #endif

        do {
            session = try await client.auth.session
            user = session?.user
            if user != nil {
                await fetchProfile()
            }
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

    /// Read user profile from auth session metadata (same as web app)
    func fetchProfile() async {
        guard let metadata = user?.userMetadata else { return }
        userFullName = metadata["full_name"]?.stringValue
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
        // Unsubscribe from realtime before signing out
        SyncService.shared.unsubscribeFromRealtime()
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
