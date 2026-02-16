# SwiftUI Best Practices (Modern Workflow)

## 1. Project Structure --- Feature-Oriented

Avoid layer-based folders:

    Views/
    Models/
    Controllers/

Use vertical feature slices:

    Features/
      Auth/
        AuthView.swift
        AuthViewModel.swift
        AuthService.swift

      Dashboard/
        DashboardView.swift
        DashboardViewModel.swift

    Core/
      Networking/
      Persistence/
      DesignSystem/

    App/
      AppState.swift
      AppRouter.swift

**Why:** - SwiftUI composes vertically. - Features become portable and
testable. - Refactors stay localized.

------------------------------------------------------------------------

## 2. State Management --- Single Source of Truth

App-level state container:

``` swift
@MainActor
final class AppState: ObservableObject {
    @Published var session: Session?
    @Published var path = NavigationPath()
}
```

Inject once at the root:

``` swift
@main
struct MyApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
        }
    }
}
```

Feature-level state:

``` swift
@MainActor
final class DashboardViewModel: ObservableObject {
    @Published private(set) var items: [Item] = []

    func load() async {
        items = await service.fetch()
    }
}
```

**Rule:**\
Views render. ViewModels mutate.

------------------------------------------------------------------------

## 3. Navigation --- Data-Driven Only

Use `NavigationStack` exclusively.

``` swift
NavigationStack(path: $appState.path) {
    DashboardView()
        .navigationDestination(for: Route.self) { route in
            switch route {
            case .detail(let id):
                DetailView(id: id)
            }
        }
}
```

Navigate via state mutation:

``` swift
appState.path.append(Route.detail(id))
```

**Benefits** - Deep linking - State restoration - Testable routing

------------------------------------------------------------------------

## 4. Async Workflows --- Structured Concurrency

Prefer async/await over Combine.

``` swift
.task {
    await viewModel.load()
}
```

User-triggered:

``` swift
Button("Refresh") {
    Task { await viewModel.reload() }
}
```

SwiftUI lifecycle aligns naturally with structured concurrency.

------------------------------------------------------------------------

## 5. Dependency Injection --- Use the Environment

Avoid DI frameworks.

Define protocol:

``` swift
protocol ItemService {
    func fetch() async -> [Item]
}
```

Inject implementation:

``` swift
.environment(\.itemService, LiveItemService())
```

Preview/test swap:

``` swift
#Preview {
    DashboardView()
        .environment(\.itemService, MockItemService())
}
```

------------------------------------------------------------------------

## 6. Preview-Driven Development

Treat previews as UI unit tests.

``` swift
#Preview("Loaded") {
    DashboardView(viewModel: .mockLoaded)
}

#Preview("Empty") {
    DashboardView(viewModel: .mockEmpty)
}
```

If a view cannot preview in isolation, dependencies are wrong.

------------------------------------------------------------------------

## 7. Testing Strategy

Focus on ViewModel tests.

``` swift
func testLoadPopulatesItems() async {
    let vm = DashboardViewModel(service: MockService())
    await vm.load()
    XCTAssertEqual(vm.items.count, 3)
}
```

Limit UI tests to critical paths: - Launch - Authentication - Core
transaction flows

------------------------------------------------------------------------

## 8. Design System First

Create primitives early:

    DesignSystem/
      DSButton.swift
      DSCard.swift
      DSTextField.swift
      Theme.swift

Prevents modifier duplication and visual drift.

------------------------------------------------------------------------

## 9. Build & Automation Flow

Local: - Xcode build/run - SwiftUI previews - Unit tests via
`xcodebuild`

CI:

    xcodebuild test
    xcodebuild archive

Avoid wrapping native tooling in Node-style pipelines.

------------------------------------------------------------------------

## 10. Anti-Patterns to Avoid

Do NOT: - Recreate Redux-style architectures unnecessarily. - Put
business logic in Views. - Overuse Combine. - Introduce coordinator
layers without UIKit interop. - Scatter shared mutable state.

------------------------------------------------------------------------

## Core Mental Model

**State drives everything.**

> State containers → Navigation + Rendering\
> Views → Pure functions of state\
> Concurrency → Replaces reactive plumbing\
> Features → Independent vertical slices
