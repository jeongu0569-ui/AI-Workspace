import SwiftUI

struct RootView: View {
    @EnvironmentObject private var store: WorkspaceStore
    @State private var selection: WorkspaceSection? = .chat
    @State private var isChatPanelVisible = false
    @State private var chatPanelDragX: CGFloat = 0

    var body: some View {
        NavigationSplitView {
            List(WorkspaceSection.allCases, selection: $selection) { section in
                Label(section.rawValue, systemImage: section.systemImage)
                    .tag(section)
            }
            .navigationTitle("Workspace")
            .safeAreaInset(edge: .bottom) {
                ServerStatusView()
                    .padding(12)
            }
        } detail: {
            detailView
                .toolbar {
                    #if os(macOS)
                    if selectedSection != .chat {
                        Button {
                            isChatPanelVisible.toggle()
                        } label: {
                            Image(systemName: isChatPanelVisible ? "sidebar.right" : "bubble.right")
                        }
                        .help(isChatPanelVisible ? "Hide chat panel" : "Show chat panel")
                    }
                    #endif
                }
        }
    }

    private var selectedSection: WorkspaceSection {
        selection ?? .chat
    }

    @ViewBuilder
    private var detailView: some View {
        #if os(macOS)
        if selectedSection != .chat && isChatPanelVisible {
            HSplitView {
                primaryDetailView
                    .frame(minWidth: 0)
                Divider()
                ChatHomeView(compact: true)
                    .frame(minWidth: 320, idealWidth: 390, maxWidth: 460)
            }
        } else {
            primaryDetailView
        }
        #else
        if selectedSection == .chat {
            primaryDetailView
        } else {
            iOSSwipeChatContainer
        }
        #endif
    }

    #if os(iOS)
    private var iOSSwipeChatContainer: some View {
        GeometryReader { proxy in
            let panelWidth = min(max(proxy.size.width * 0.88, 300), 430)
            ZStack(alignment: .trailing) {
                primaryDetailView
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                if isChatPanelVisible {
                    Color.black.opacity(0.24)
                        .ignoresSafeArea()
                        .onTapGesture {
                            withAnimation(.spring(response: 0.28, dampingFraction: 0.9)) {
                                isChatPanelVisible = false
                                chatPanelDragX = 0
                            }
                        }
                }

                HStack(spacing: 0) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(.secondary.opacity(0.55))
                        .frame(width: 3, height: 44)
                        .padding(.leading, 7)
                        .padding(.trailing, 5)

                    ChatHomeView(compact: true)
                        .frame(width: panelWidth)
                        .background(.regularMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                        .shadow(color: .black.opacity(0.22), radius: 18, x: -6, y: 0)
                }
                .frame(width: panelWidth + 15)
                .frame(maxHeight: .infinity)
                .offset(x: chatPanelOffset(panelWidth: panelWidth))
                .gesture(chatPanelGesture(panelWidth: panelWidth))

                if !isChatPanelVisible {
                    Color.clear
                        .frame(width: 28)
                        .contentShape(Rectangle())
                        .gesture(chatPanelGesture(panelWidth: panelWidth))
                }
            }
            .clipped()
        }
    }

    private func chatPanelOffset(panelWidth: CGFloat) -> CGFloat {
        let closedOffset = panelWidth + 15
        if isChatPanelVisible {
            return max(0, chatPanelDragX)
        }
        return max(0, closedOffset + chatPanelDragX)
    }

    private func chatPanelGesture(panelWidth: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { value in
                if isChatPanelVisible {
                    chatPanelDragX = max(0, value.translation.width)
                } else {
                    chatPanelDragX = min(0, value.translation.width)
                }
            }
            .onEnded { value in
                let shouldOpen = isChatPanelVisible
                    ? value.translation.width < panelWidth * 0.36
                    : value.translation.width < -48
                withAnimation(.spring(response: 0.28, dampingFraction: 0.9)) {
                    isChatPanelVisible = shouldOpen
                    chatPanelDragX = 0
                }
            }
    }
    #endif

    @ViewBuilder
    private var primaryDetailView: some View {
        switch selectedSection {
        case .chat:
            ChatHomeView()
        case .notes:
            FileSectionView(title: "Notes", root: "notes")
        case .code:
            FileSectionView(title: "Code", root: "code")
        case .search:
            SearchView()
        }
    }
}

struct ServerStatusView: View {
    @EnvironmentObject private var store: WorkspaceStore

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextField("Workspace Server", text: $store.serverURLText)
                .textFieldStyle(.roundedBorder)
                #if os(iOS)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
                #endif
                .onChange(of: store.serverURLText) {
                    store.persistServerURLText()
                }
                .onSubmit {
                    store.saveServerURL()
                    Task { await store.refreshWorkspace() }
                }
            Text(store.serverConnectionHint)
                .font(.caption2)
                .foregroundStyle(store.serverURLUsesLocalhost ? .orange : .secondary)
                .fixedSize(horizontal: false, vertical: true)
            #if os(iOS)
            Button {
                store.useMacTailscaleServerURL()
                Task { await store.refreshWorkspace() }
            } label: {
                Label("Use Mac Tailscale", systemImage: "network")
                    .labelStyle(.titleAndIcon)
                    .font(.caption)
            }
            .buttonStyle(.borderless)
            #endif
            HStack {
                Circle()
                    .fill(store.statusMessage == "Connected" ? .green : .orange)
                    .frame(width: 8, height: 8)
                Text(store.statusMessage)
                    .font(.caption)
                    .lineLimit(2)
                Spacer()
                Button {
                    store.saveServerURL()
                    Task { await store.refreshWorkspace() }
                } label: {
                    Label("Connect", systemImage: "arrow.clockwise")
                        .labelStyle(.titleAndIcon)
                }
                .buttonStyle(.borderless)
            }
            Text(store.connectionDetail)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)
            Text("Step: \(store.connectionStep)")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }
}
