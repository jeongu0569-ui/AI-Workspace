import SwiftUI
#if os(macOS)
import AppKit
#endif

@main
struct AIWorkspaceApp: App {
    @StateObject private var store = WorkspaceStore()

    var body: some Scene {
        #if os(macOS)
        WindowGroup {
            rootView
        }
        .windowStyle(.titleBar)
        #else
        WindowGroup {
            rootView
        }
        #endif
    }

    private var rootView: some View {
        RootView()
            .environmentObject(store)
            #if os(macOS)
            .onAppear {
                activateMacAppWindow()
            }
            #endif
            .task {
                await store.refreshWorkspace()
            }
    }
}

#if os(macOS)
@MainActor
private func activateMacAppWindow() {
    NSApp.setActivationPolicy(.regular)
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
        NSApp.windows.first?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
#endif
