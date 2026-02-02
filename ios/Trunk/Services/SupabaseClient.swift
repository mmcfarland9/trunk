//
//  SupabaseClient.swift
//  Trunk
//
//  Supabase client singleton for cloud sync.
//

import Foundation
import Supabase

enum SupabaseClientProvider {
    static let shared: Supabase.SupabaseClient? = {
        guard !Secrets.supabaseURL.contains("xxxxx"),
              !Secrets.supabaseAnonKey.contains("...") else {
            print("Supabase not configured. Cloud sync disabled.")
            return nil
        }

        guard let url = URL(string: Secrets.supabaseURL) else {
            print("Invalid Supabase URL")
            return nil
        }

        return Supabase.SupabaseClient(
            supabaseURL: url,
            supabaseKey: Secrets.supabaseAnonKey
        )
    }()

    static var isConfigured: Bool {
        shared != nil
    }
}
