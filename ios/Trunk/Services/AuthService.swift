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
            let testPassword = ProcessInfo.processInfo.environment["TRUNK_TEST_PASSWORD"] ?? ""
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
            session = try await withTimeout(seconds: 10) { [client] in
                try await client.auth.session
            }
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

    /// E2E test login via edge function. Returns true if the email is an
    /// allowlisted test account and sign-in succeeded, false if not a test email.
    func e2eLogin(email: String) async throws -> Bool {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard trimmed == "test@trunk.michaelpmcfarland.com" else { return false }

        guard let client = SupabaseClientProvider.shared else {
            throw AuthError.notConfigured
        }

        let url = URL(string: "\(Secrets.supabaseURL)/functions/v1/e2e-login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Secrets.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try JSONEncoder().encode(["email": trimmed])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.e2eLoginFailed
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let session = json?["session"] as? [String: Any],
              let accessToken = session["access_token"] as? String,
              let refreshToken = session["refresh_token"] as? String else {
            throw AuthError.e2eLoginFailed
        }

        let authSession = try await client.auth.setSession(
            accessToken: accessToken,
            refreshToken: refreshToken
        )
        self.session = authSession
        self.user = authSession.user
        await fetchProfile()
        return true
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
        // Clean up sync state before signing out to prevent stale cache
        // if a different user signs in next
        SyncService.shared.unsubscribeFromRealtime()
        SyncService.shared.clearLocalCache()
        try await client.auth.signOut()
    }
}

enum AuthError: LocalizedError {
    case notConfigured
    case e2eLoginFailed

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Supabase is not configured"
        case .e2eLoginFailed:
            return "Test login failed"
        }
    }
}
