//
//  LoginView.swift
//  Trunk
//
//  Login view with email OTP authentication.
//

import SwiftUI

struct LoginView: View {
    @State private var email = ""
    @State private var code = ""
    @State private var showCodeEntry = false
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            Color.parchment
                .ignoresSafeArea()

            VStack(spacing: TrunkTheme.space6) {
                Spacer()

                VStack(spacing: TrunkTheme.space2) {
                    Text("TRUNK")
                        .trunkFont(size: 28, weight: .semibold)
                        .tracking(6)
                        .foregroundStyle(Color.wood)

                    Text("Reap what you sow")
                        .trunkFont(size: TrunkTheme.textSm)
                        .foregroundStyle(Color.inkFaint)
                        .italic()
                }

                Spacer()

                if showCodeEntry {
                    codeEntryForm
                } else {
                    emailForm
                }

                if let error = errorMessage {
                    Text(error)
                        .trunkFont(size: TrunkTheme.textXs)
                        .foregroundStyle(Color.trunkDestructive)
                        .padding(TrunkTheme.space3)
                        .background(Color.trunkDestructive.opacity(0.08))
                        .overlay(
                            Rectangle()
                                .stroke(Color.trunkDestructive.opacity(0.3), lineWidth: 1)
                        )
                }

                Spacer()
            }
            .padding(TrunkTheme.space4)
            .disabled(isLoading)
            .overlay {
                if isLoading {
                    ProgressView()
                        .tint(Color.wood)
                }
            }
        }
    }

    private var emailForm: some View {
        VStack(spacing: TrunkTheme.space4) {
            TextField("Email address", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .trunkFont(size: TrunkTheme.textBase)
                .foregroundStyle(Color.ink)
                .padding(TrunkTheme.space3)
                .background(Color.paper)
                .overlay(
                    Rectangle()
                        .stroke(Color.border, lineWidth: 1)
                )

            Button("SEND CODE") {
                Task { await requestCode() }
            }
            .buttonStyle(.trunk)
            .disabled(email.isEmpty)
            .opacity(email.isEmpty ? 0.5 : 1)
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .frame(maxWidth: 300)
    }

    private var codeEntryForm: some View {
        VStack(spacing: TrunkTheme.space4) {
            Text("Code sent to \(email)")
                .trunkFont(size: TrunkTheme.textXs)
                .foregroundStyle(Color.inkFaint)

            TextField("6-digit code", text: $code)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .trunkFont(size: TrunkTheme.textLg)
                .foregroundStyle(Color.ink)
                .padding(TrunkTheme.space3)
                .background(Color.paper)
                .overlay(
                    Rectangle()
                        .stroke(Color.border, lineWidth: 1)
                )

            Button("VERIFY") {
                Task { await verifyCode() }
            }
            .buttonStyle(.trunk)
            .disabled(code.count != 6)
            .opacity(code.count != 6 ? 0.5 : 1)
            .frame(maxWidth: .infinity, alignment: .trailing)

            Button {
                showCodeEntry = false
                code = ""
                errorMessage = nil
            } label: {
                Text("BACK")
                    .trunkFont(size: TrunkTheme.textSm)
                    .foregroundStyle(Color.inkFaint)
            }
        }
        .frame(maxWidth: 300)
    }

    private func requestCode() async {
        isLoading = true
        errorMessage = nil

        do {
            // E2E test account: skip OTP, sign in directly via edge function
            if try await AuthService.shared.e2eLogin(email: email) {
                // Auth state change will dismiss this view
                isLoading = false
                return
            }

            try await AuthService.shared.requestCode(email: email)
            showCodeEntry = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func verifyCode() async {
        isLoading = true
        errorMessage = nil

        do {
            try await AuthService.shared.verifyCode(email: email, code: code)
            // Auth state change will dismiss this view
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    LoginView()
}
