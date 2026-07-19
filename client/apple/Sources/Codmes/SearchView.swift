import SwiftUI

struct SearchView: View {
    @EnvironmentObject private var store: WorkspaceStore
    @Environment(\.dismiss) private var dismiss
    var onSelectSurface: ((String) -> Void)?

    @State private var query = ""
    @State private var surface = GlobalSearchSurface.all
    @State private var isSearching = false
    @State private var liveSearchTask: Task<Void, Never>?
    @State private var searchRequestSerial = 0
    @FocusState private var isSearchFieldFocused: Bool

    private var groupedResults: [(GlobalSearchSurface, [GlobalSearchResult])] {
        let results = visibleResults
        return GlobalSearchSurface.resultGroups.compactMap { group in
            let matches = results.filter { $0.surface == group.rawValue }
            return matches.isEmpty ? nil : (group, matches)
        }
    }

    private var noteFileGroups: [NoteSearchFileGroup] {
        let notes = visibleResults.filter { $0.surface == "notes" }
        let grouped = Dictionary(grouping: notes) { $0.target.path ?? $0.title }
        return grouped.map { path, results in
            NoteSearchFileGroup(path: path, results: results.sorted(by: sortSearchResults))
        }
        .sorted { lhs, rhs in
            (lhs.results.first?.score ?? 0) > (rhs.results.first?.score ?? 0)
        }
    }

    private var visibleResults: [GlobalSearchResult] {
        (store.globalSearchResponse?.results ?? []).filter { result in
            guard let path = result.target.path else { return true }
            let lowered = path.lowercased()
            return !lowered.hasPrefix(".codmes/") && !lowered.contains("/.codmes/")
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            searchHeader
            VStack(spacing: 12) {
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    searchTextField

                    Button("Search") {
                        submitSearch()
                    }
                    .disabled(draftQuery.isEmpty)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.secondary.opacity(0.10), in: RoundedRectangle(cornerRadius: 8))

                Picker("Surface", selection: $surface) {
                    ForEach(GlobalSearchSurface.allCases) { surface in
                        Text(surface.title).tag(surface)
                    }
                }
                .pickerStyle(.segmented)
                .onChange(of: surface) { _, _ in
                    scheduleLiveSearch(delay: 0)
                }
            }
            .padding(16)
            .background(.quaternary.opacity(0.10))
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(.quaternary.opacity(0.35))
                    .frame(height: 1)
            }

            if submittedQuery.isEmpty {
                ContentUnavailableView(
                    "Search Codmes",
                    systemImage: "magnifyingglass",
                    description: Text("Find notes, PDF text, code, sessions, and messages.")
                )
                .contentShape(Rectangle())
                .onTapGesture { dismissSearchKeyboard() }
            } else if isSearching && (store.globalSearchResponse?.query != submittedQuery) {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .contentShape(Rectangle())
                    .onTapGesture { dismissSearchKeyboard() }
            } else if groupedResults.isEmpty {
                ContentUnavailableView(
                    "No Results",
                    systemImage: "doc.text.magnifyingglass",
                    description: Text("Try another keyword or switch the Surface filter.")
                )
                .contentShape(Rectangle())
                .onTapGesture { dismissSearchKeyboard() }
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 18, pinnedViews: []) {
                        ForEach(groupedResults, id: \.0) { group, results in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(group.title)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                    .textCase(.uppercase)
                                    .padding(.horizontal, 16)

                                VStack(alignment: .leading, spacing: 0) {
                                    if group == .notes {
                                        ForEach(noteFileGroups) { fileGroup in
                                            NoteSearchFileGroupView(fileGroup: fileGroup, query: submittedQuery, thumbnailURL: thumbnailURL(for:)) { result in
                                                openResult(result)
                                            }
                                            .padding(.horizontal, 16)
                                            .background(Color.secondary.opacity(0.07))
                                        }
                                    } else {
                                        ForEach(results) { result in
                                            Button {
                                                openResult(result)
                                            } label: {
                                                GlobalSearchResultRow(result: result, query: submittedQuery)
                                                    .padding(.horizontal, 16)
                                            }
                                            .buttonStyle(.plain)
                                            .background(Color.secondary.opacity(0.07))
                                        }
                                    }
                                }
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .padding(.horizontal, 12)
                            }
                        }
                    }
                    .padding(.vertical, 14)
                }
                .contentShape(Rectangle())
                .simultaneousGesture(TapGesture().onEnded { dismissSearchKeyboard() })
#if os(iOS)
                .scrollDismissesKeyboard(.immediately)
#endif
            }
        }
#if os(iOS)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ignoresSafeArea(.keyboard, edges: .bottom)
#else
        .frame(minWidth: 560, minHeight: 520)
#endif
        .onAppear { focusSearchFieldIfNeeded() }
        .task {
            submitSearchIfReady()
        }
        .onDisappear {
            liveSearchTask?.cancel()
        }
    }

    private var searchHeader: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Global Search")
                    .font(.title2.weight(.semibold))
                Text("Search Notes, Codes, and Chat")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer()
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .frame(width: 32, height: 32)
            }
            .buttonStyle(.plain)
            .contentShape(Rectangle())
            .accessibilityLabel("Close search")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(.quaternary.opacity(0.18))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(.quaternary.opacity(0.55))
                .frame(height: 1)
        }
    }

    @ViewBuilder
    private var searchTextField: some View {
        TextField("Search Codmes", text: $query)
            .textFieldStyle(.plain)
            .focused($isSearchFieldFocused)
            .onSubmit { submitSearch() }
            .submitLabel(.search)
            .autocorrectionDisabled()
#if os(iOS)
            .textInputAutocapitalization(.never)
#endif
            .onChange(of: query) { _, _ in
                scheduleLiveSearch()
            }
    }

    private var draftQuery: String {
        query.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var submittedQuery: String {
        query.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func submitSearchIfReady() {
        guard !draftQuery.isEmpty else { return }
        scheduleLiveSearch(delay: 0)
    }

    private func submitSearch() {
        let searchQuery = draftQuery
        guard !searchQuery.isEmpty else { return }
        liveSearchTask?.cancel()
        searchRequestSerial += 1
        runGlobalSearch(query: searchQuery, surfaceValue: surface.rawValue, requestID: searchRequestSerial)
    }

    private func scheduleLiveSearch(_ rawQuery: String? = nil, delay: UInt64 = 350_000_000) {
        let searchQuery = (rawQuery ?? draftQuery).trimmingCharacters(in: .whitespacesAndNewlines)
        liveSearchTask?.cancel()
        searchRequestSerial += 1
        let requestID = searchRequestSerial
        guard !searchQuery.isEmpty else {
            query = ""
            isSearching = false
            store.globalSearchResponse = nil
            return
        }
        let surfaceValue = surface.rawValue
        guard store.api != nil else { return }
        liveSearchTask = Task {
            if delay > 0 {
                do {
                    try await Task.sleep(nanoseconds: delay)
                } catch {
                    return
                }
            }
            guard !Task.isCancelled else { return }
            await MainActor.run {
                runGlobalSearch(query: searchQuery, surfaceValue: surfaceValue, requestID: requestID)
            }
        }
    }

    private func runGlobalSearch(query searchQuery: String, surfaceValue: String, requestID: Int) {
        guard let api = store.api else { return }
        query = searchQuery
        isSearching = true
        Task {
            do {
                let response = try await api.globalSearch(query: searchQuery, surface: surfaceValue)
                await MainActor.run {
                    guard searchRequestSerial == requestID else { return }
                    store.globalSearchResponse = response
                    store.statusMessage = "\(response.resultCount) global results"
                    isSearching = false
                }
            } catch {
                await MainActor.run {
                    guard searchRequestSerial == requestID else { return }
                    store.statusMessage = error.localizedDescription
                    isSearching = false
                }
            }
        }
    }

    private func focusSearchFieldIfNeeded() {
#if os(macOS)
        let delays: [TimeInterval] = [0.08]
        for delay in delays {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                isSearchFieldFocused = true
            }
        }
#endif
    }

    private func dismissSearchKeyboard() {
        isSearchFieldFocused = false
    }

    private func thumbnailURL(for result: GlobalSearchResult) -> URL? {
        guard let path = result.target.path,
              path.lowercased().hasSuffix(".pdf"),
              let api = store.api else { return nil }
        let page = result.target.page ?? 1
        return try? api.pdfThumbnailURL(path: path, page: page)
    }

    private func openResult(_ result: GlobalSearchResult) {
        onSelectSurface?(result.surface)
        Task {
            await store.openGlobalSearchResult(result)
            dismiss()
        }
    }
}

private struct NoteSearchFileGroup: Identifiable {
    let path: String
    let results: [GlobalSearchResult]

    var id: String { path }
    var title: String { URL(fileURLWithPath: path).lastPathComponent }
}

private struct NoteSearchFileGroupView: View {
    let fileGroup: NoteSearchFileGroup
    let query: String
    let thumbnailURL: (GlobalSearchResult) -> URL?
    let onOpen: (GlobalSearchResult) -> Void

    private var previewResults: [GlobalSearchResult] {
        let pagedResults = fileGroup.results.filter { $0.target.page != nil }
        return pagedResults.isEmpty ? fileGroup.results : pagedResults
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: fileGroup.title.lowercased().hasSuffix(".pdf") ? "doc.richtext" : "note.text")
                    .foregroundStyle(.secondary)
                    .frame(width: 18)
                VStack(alignment: .leading, spacing: 2) {
                    Text(fileGroup.title)
                        .font(.headline)
                        .lineLimit(1)
                        .truncationMode(.middle)
                    Text("\(fileGroup.results.count) results")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(previewResults.prefix(12)) { result in
                        Button {
                            onOpen(result)
                        } label: {
                            NoteSearchPreviewCard(result: result, query: query, thumbnailURL: thumbnailURL(result))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.bottom, 2)
            }
        }
        .padding(.vertical, 8)
    }
}

private struct NoteSearchPreviewCard: View {
    let result: GlobalSearchResult
    let query: String
    let thumbnailURL: URL?

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.secondary.opacity(0.09))
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.secondary.opacity(0.22), lineWidth: 1)
                if let thumbnailURL {
                    AsyncImage(url: thumbnailURL) { phase in
                        switch phase {
                        case let .success(image):
                            image
                                .resizable()
                                .scaledToFill()
                                .frame(width: 146, height: 120)
                                .clipped()
                        case .failure:
                            snippetPreview
                        case .empty:
                            ProgressView()
                                .frame(width: 146, height: 120)
                        @unknown default:
                            snippetPreview
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                } else {
                    snippetPreview
                }
            }
            .frame(width: 146, height: 120)

            Text(pageLabel)
                .font(.caption.weight(.medium))
                .foregroundStyle(.primary)
                .lineLimit(1)
        }
        .frame(width: 146, alignment: .leading)
        .contentShape(Rectangle())
    }

    private var snippetPreview: some View {
        Text(result.snippet)
            .font(.caption)
            .lineLimit(6)
            .foregroundStyle(.secondary)
            .padding(10)
            .frame(width: 146, height: 120, alignment: .topLeading)
    }

    private var pageLabel: String {
        if let page = result.target.page {
            return "\(page) page"
        }
        return result.kind.replacingOccurrences(of: "_", with: " ")
    }
}

private struct GlobalSearchResultRow: View {
    let result: GlobalSearchResult
    let query: String

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 8) {
                Image(systemName: iconName)
                    .foregroundStyle(.secondary)
                    .frame(width: 18)
                Text(result.title)
                    .font(.headline)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Spacer()
                Text(result.kind.replacingOccurrences(of: "_", with: " "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Text(result.subtitle)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .truncationMode(.middle)
            Text(result.snippet)
                .font(.body)
                .foregroundStyle(.secondary)
                .lineLimit(3)
                .textSelection(.enabled)
            HStack(spacing: 10) {
                Text(result.surface.capitalized)
                Text("score \(Int(result.score.rounded()))")
                if let updatedAt = result.updatedAt, !updatedAt.isEmpty {
                    Text(updatedAt)
                }
            }
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }
        .contentShape(Rectangle())
        .padding(.vertical, 6)
    }

    private var iconName: String {
        switch result.surface {
        case "notes":
            result.kind.contains("pdf") ? "doc.richtext" : "note.text"
        case "codes":
            "chevron.left.forwardslash.chevron.right"
        case "chat":
            "bubble.left.and.bubble.right"
        default:
            "magnifyingglass"
        }
    }
}

private enum GlobalSearchSurface: String, CaseIterable, Identifiable {
    case all
    case notes
    case codes
    case chat

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all: "All"
        case .notes: "Notes"
        case .codes: "Codes"
        case .chat: "Chat"
        }
    }

    static var resultGroups: [GlobalSearchSurface] {
        [.notes, .codes, .chat]
    }
}

private func sortSearchResults(_ lhs: GlobalSearchResult, _ rhs: GlobalSearchResult) -> Bool {
    if let lhsPage = lhs.target.page, let rhsPage = rhs.target.page, lhs.target.path == rhs.target.path {
        return lhsPage < rhsPage
    }
    return lhs.score > rhs.score
}
