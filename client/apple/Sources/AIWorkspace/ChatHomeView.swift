import SwiftUI

struct ChatHomeView: View {
    @EnvironmentObject private var store: WorkspaceStore
    @State private var draft = ""
    @State private var showingSessionManager = false

    var body: some View {
        VStack(spacing: 0) {
            HeaderView(title: "Hermes Chat", subtitle: store.workspace?.hermes.serverUrl ?? "No Hermes server loaded")
            ScrollView {
                VStack(spacing: 14) {
                    ForEach(store.chatLines) { line in
                        MessageBubble(line: line) { approved in
                            Task { await store.respondToApproval(lineId: line.id, approved: approved) }
                        }
                    }
                }
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            Divider()
            VStack(spacing: 10) {
                HStack(spacing: 10) {
                    Picker("Model", selection: $store.selectedHermesModelId) {
                        if store.hermesModels.isEmpty {
                            Text("Default Hermes model").tag("")
                        } else {
                            ForEach(store.hermesModels) { model in
                                Text(model.label).tag(model.id)
                            }
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: 260)
                    .help("Model for the next new Hermes live session")

                    Menu {
                        if store.hermesSessions.isEmpty {
                            Text("No sessions loaded")
                        } else {
                            ForEach(store.hermesSessions) { session in
                                Button {
                                    Task { await store.resumeHermesSession(session) }
                                } label: {
                                    VStack(alignment: .leading) {
                                        Text(session.title)
                                        if let updatedAt = session.updatedAt {
                                            Text(updatedAt)
                                        }
                                    }
                                }
                            }
                        }
                    } label: {
                        Label("Sessions", systemImage: "clock.arrow.circlepath")
                    }
                    .menuStyle(.borderlessButton)

                    Button {
                        Task { await store.refreshHermesMetadata() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .buttonStyle(.borderless)
                    .help("Refresh Hermes models and sessions")

                    Spacer()
                }

                HStack(spacing: 10) {
                    Picker("Context", selection: $store.chatContextScope) {
                        ForEach(ChatContextScope.allCases) { scope in
                            Label(scope.label, systemImage: scope.systemImage)
                                .tag(scope)
                        }
                    }
                    .pickerStyle(.menu)
                    .labelsHidden()

                    Text(store.chatContextLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)

                    Spacer()
                }

                HStack(spacing: 12) {
                    Button {
                        store.prepareNewChat()
                    } label: {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.borderless)
                    .help("New chat")

                    Button {
                        showingSessionManager = true
                    } label: {
                        Image(systemName: "clock.arrow.circlepath")
                    }
                    .buttonStyle(.borderless)
                    .help("Search and manage sessions")

                    TextField("Message Hermes...", text: $draft, axis: .vertical)
                        .textFieldStyle(.plain)
                        .lineLimit(1...4)
                        .padding(10)
                        .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 8))
                        .onSubmit(sendDraft)
                    Button {
                        sendDraft()
                    } label: {
                        Image(systemName: "paperplane.fill")
                    }
                    .buttonStyle(.borderless)
                    .font(.title3)
                    .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .padding(16)
        }
        .sheet(isPresented: $showingSessionManager) {
            SessionManagerView(isPresented: $showingSessionManager)
                .environmentObject(store)
        }
    }

    private func sendDraft() {
        let message = draft
        draft = ""
        Task { await store.sendChatMessage(message) }
    }
}

struct SessionManagerView: View {
    @EnvironmentObject private var store: WorkspaceStore
    @Binding var isPresented: Bool
    @State private var pendingDelete: HermesSessionSummary?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("History")
                        .font(.title2.weight(.semibold))
                    Text("Search and manage Hermes sessions.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button {
                    Task { await store.refreshHermesMetadata() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .buttonStyle(.borderless)
                Button {
                    isPresented = false
                } label: {
                    Image(systemName: "xmark")
                }
                .buttonStyle(.borderless)
            }

            TextField("Search session title...", text: $store.sessionManagerSearch)
                .textFieldStyle(.roundedBorder)

            if store.filteredHermesSessions.isEmpty {
                ContentUnavailableView("No sessions", systemImage: "clock", description: Text("No saved Hermes sessions match this search."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(store.filteredHermesSessions) { session in
                    HStack(spacing: 12) {
                        Button {
                            Task {
                                await store.resumeHermesSession(session)
                                isPresented = false
                            }
                        } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(session.title)
                                    .lineLimit(1)
                                if let updatedAt = session.updatedAt {
                                    Text(updatedAt)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.plain)

                        Button(role: .destructive) {
                            pendingDelete = session
                        } label: {
                            Image(systemName: "trash")
                        }
                        .buttonStyle(.borderless)
                        .disabled(session.id == store.liveSessionId)
                        .help(session.id == store.liveSessionId ? "Cannot delete the active session" : "Delete session")
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .padding(20)
        .frame(idealWidth: 520, idealHeight: 460)
        .confirmationDialog(
            "Delete this Hermes session?",
            isPresented: Binding(
                get: { pendingDelete != nil },
                set: { if !$0 { pendingDelete = nil } }
            ),
            presenting: pendingDelete
        ) { session in
            Button("Delete \(session.title)", role: .destructive) {
                Task {
                    await store.deleteHermesSession(session)
                    pendingDelete = nil
                }
            }
            Button("Cancel", role: .cancel) {
                pendingDelete = nil
            }
        } message: { session in
            Text("This deletes the saved Hermes session, not just the local row: \(session.title)")
        }
    }
}

struct MessageBubble: View {
    let line: ChatLine
    let onApproval: (Bool) -> Void
    @State private var activityExpanded = false

    var body: some View {
        HStack {
            if line.role == "user" {
                Spacer(minLength: 52)
            }

            VStack(alignment: bubbleAlignment, spacing: 6) {
                Text(roleLabel)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                if line.role == "activity" {
                    activityView
                } else {
                    Text(line.text)
                        .textSelection(.enabled)
                        .multilineTextAlignment(line.role == "user" ? .trailing : .leading)
                }
                if line.role == "approval", let state = line.approvalState {
                    approvalControls(state)
                }
            }
            .padding(bubblePadding)
            .background(bubbleBackground, in: RoundedRectangle(cornerRadius: 10))

            if line.role != "user" {
                Spacer(minLength: line.role == "activity" ? 120 : 52)
            }
        }
        .frame(maxWidth: line.role == "activity" ? 640 : .infinity, alignment: frameAlignment)
    }

    private var roleLabel: String {
        switch line.role {
        case "user": "YOU"
        case "assistant": "AI"
        default: line.role.uppercased()
        }
    }

    private var bubbleAlignment: HorizontalAlignment {
        line.role == "user" ? .trailing : .leading
    }

    private var frameAlignment: Alignment {
        line.role == "user" ? .trailing : .leading
    }

    private var bubbleBackground: AnyShapeStyle {
        if line.role == "activity" {
            return AnyShapeStyle(.quaternary.opacity(0.22))
        }
        if line.role == "user" {
            return AnyShapeStyle(.tint.opacity(0.18))
        }
        return AnyShapeStyle(.quaternary.opacity(0.35))
    }

    private var bubblePadding: EdgeInsets {
        if line.role == "activity" {
            return EdgeInsets(top: 7, leading: 10, bottom: 7, trailing: 10)
        }
        return EdgeInsets(top: 12, leading: 12, bottom: 12, trailing: 12)
    }

    private var activityView: some View {
        DisclosureGroup(isExpanded: $activityExpanded) {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(line.activityItems) { item in
                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.type)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(item.text)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .textSelection(.enabled)
                    }
                    .padding(.vertical, 1)
                }
            }
            .padding(.top, 4)
        } label: {
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 8) {
                    Image(systemName: line.isStreamingActivity ? "sparkles" : "waveform.path")
                        .foregroundStyle(.secondary)
                    Text(line.text)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .shimmering(active: line.isStreamingActivity)

                if line.isStreamingActivity && !activityExpanded {
                    Text(activityPreview)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                        .textSelection(.enabled)
                        .transition(.opacity)
                }
            }
        }
    }

    private var activityPreview: String {
        line.activityItems.last?.text.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    }

    @ViewBuilder
    private func approvalControls(_ state: ApprovalState) -> some View {
        switch state {
        case .pending:
            HStack(spacing: 12) {
                Button {
                    onApproval(true)
                } label: {
                    Label("Approve", systemImage: "checkmark.circle")
                }
                Button {
                    onApproval(false)
                } label: {
                    Label("Deny", systemImage: "xmark.circle")
                }
            }
            .buttonStyle(.borderless)
            .padding(.top, 4)
        case .approved:
            Label("Approved", systemImage: "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(.green)
        case .denied:
            Label("Denied", systemImage: "xmark.circle.fill")
                .font(.caption)
                .foregroundStyle(.red)
        }
    }
}

private struct ShimmerModifier: ViewModifier {
    let active: Bool
    @State private var phase = -0.8

    func body(content: Content) -> some View {
        if active {
            content
                .overlay {
                    GeometryReader { proxy in
                        LinearGradient(
                            colors: [.clear, .white.opacity(0.28), .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: max(80, proxy.size.width * 0.45))
                        .offset(x: proxy.size.width * phase)
                        .blendMode(.plusLighter)
                    }
                    .mask(content)
                }
                .onAppear {
                    withAnimation(.linear(duration: 1.25).repeatForever(autoreverses: false)) {
                        phase = 1.4
                    }
                }
        } else {
            content
        }
    }
}

private extension View {
    func shimmering(active: Bool) -> some View {
        modifier(ShimmerModifier(active: active))
    }
}
