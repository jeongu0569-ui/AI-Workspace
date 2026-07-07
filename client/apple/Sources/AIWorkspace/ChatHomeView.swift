import SwiftUI

struct ChatHomeView: View {
    @EnvironmentObject private var store: WorkspaceStore
    @State private var draft = ""

    var body: some View {
        VStack(spacing: 0) {
            HeaderView(title: "Hermes Chat", subtitle: store.workspace?.hermes.serverUrl ?? "No Hermes server loaded")
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(store.chatLines) { line in
                        MessageBubble(role: line.role, text: line.text)
                    }
                }
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            Divider()
            VStack(spacing: 10) {
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
                        Task { await store.connectLiveChat() }
                    } label: {
                        Image(systemName: "bolt.horizontal")
                    }
                    .buttonStyle(.borderless)
                    .help("Connect live Hermes session")

                    TextField("Message Hermes...", text: $draft, axis: .vertical)
                        .textFieldStyle(.plain)
                        .lineLimit(1...5)
                        .padding(10)
                        .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 8))
                    Button {
                        let message = draft
                        draft = ""
                        Task { await store.sendChatMessage(message) }
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
    }
}

struct MessageBubble: View {
    let role: String
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(role.uppercased())
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(text)
                .textSelection(.enabled)
        }
        .padding(12)
        .background(.quaternary.opacity(0.35), in: RoundedRectangle(cornerRadius: 8))
    }
}
