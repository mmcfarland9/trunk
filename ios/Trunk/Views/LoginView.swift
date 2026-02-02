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
        VStack(spacing: 24) {
            Spacer()

            Text("Trunk")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("Reap what you sow")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .italic()

            Spacer()

            if showCodeEntry {
                codeEntryForm
            } else {
                emailForm
            }

            if let error = errorMessage {
                Text(error)
                    .foregroundStyle(.red)
                    .font(.caption)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            Spacer()
        }
        .padding()
        .disabled(isLoading)
        .overlay {
            if isLoading {
                ProgressView()
            }
        }
    }

    private var emailForm: some View {
        VStack(spacing: 16) {
            TextField("Email address", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .textFieldStyle(.roundedBorder)

            Button("Send code") {
                Task { await requestCode() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(email.isEmpty)
        }
        .frame(maxWidth: 300)
    }

    private var codeEntryForm: some View {
        VStack(spacing: 16) {
            Text("Code sent to \(email)")
                .font(.caption)
                .foregroundStyle(.secondary)

            TextField("6-digit code", text: $code)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .textFieldStyle(.roundedBorder)
                .multilineTextAlignment(.center)

            Button("Verify") {
                Task { await verifyCode() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(code.count != 6)

            Button("Back") {
                showCodeEntry = false
                code = ""
                errorMessage = nil
            }
            .buttonStyle(.borderless)
        }
        .frame(maxWidth: 300)
    }

    private func requestCode() async {
        isLoading = true
        errorMessage = nil

        do {
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
