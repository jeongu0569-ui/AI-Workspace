import fs from "node:fs/promises";
import path from "node:path";

export async function searchMemory(workspaceRoot, query, context = {}) {
  const q = String(query || "").toLowerCase();
  
  // Sources to collect candidates from:
  // 1. User memories
  // 2. Project memories (if currentProjectId matches)
  // 3. Folder memories (if currentFolderId matches)
  // 4. Session summaries (from all sessions)
  
  const candidates = [];
  
  // 1. User memories
  try {
    const filePath = path.join(workspaceRoot, ".ai-workspace", "memory", "user", "memories.jsonl");
    const data = await fs.readFile(filePath, "utf8");
    const lines = data.split("\n").filter(Boolean).map(JSON.parse);
    lines.forEach(m => {
      candidates.push({
        type: "user_memory",
        content: m.content,
        createdAt: m.createdAt || new Date().toISOString(),
        pinned: Boolean(m.pinned),
        source: m.sourceSessionIds || []
      });
    });
  } catch {}

  // 2. Folder memories
  if (context.currentFolderId) {
    try {
      const filePath = path.join(workspaceRoot, ".ai-workspace", "memory", "folders", `folder-${context.currentFolderId}.json`);
      const data = await fs.readFile(filePath, "utf8");
      const list = JSON.parse(data);
      list.forEach(m => {
        candidates.push({
          type: "folder_memory",
          folderId: context.currentFolderId,
          content: m.content,
          createdAt: m.createdAt || new Date().toISOString(),
          pinned: Boolean(m.pinned)
        });
      });
    } catch {}
  }

  // 3. Project memories
  if (context.currentProjectId) {
    try {
      const filePath = path.join(workspaceRoot, ".ai-workspace", "memory", "projects", `project-${context.currentProjectId}.jsonl`);
      const data = await fs.readFile(filePath, "utf8");
      const lines = data.split("\n").filter(Boolean).map(JSON.parse);
      lines.forEach(m => {
        candidates.push({
          type: "project_memory",
          projectId: context.currentProjectId,
          content: m.content,
          createdAt: m.createdAt || new Date().toISOString(),
          pinned: Boolean(m.pinned)
        });
      });
    } catch {}
  }

  // 4. Session summaries
  const sessionsDir = path.join(workspaceRoot, ".ai-workspace", "sessions");
  try {
    const files = await fs.readdir(sessionsDir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const data = await fs.readFile(path.join(sessionsDir, file), "utf8");
        const session = JSON.parse(data);
        if (session.summary && session.summary.content) {
          candidates.push({
            type: "session_summary_memory",
            sessionId: session.id,
            folderId: session.folderId,
            projectId: session.projectId,
            content: session.summary.content,
            createdAt: session.summary.updatedAt || session.updatedAt || session.createdAt || new Date().toISOString(),
            pinned: Boolean(session.pinned)
          });
        }
      } catch {}
    }
  } catch {}

  // Filter & Score candidates
  const scored = candidates.map(c => {
    const score = calculateMemoryScore(c, q, context);
    return { ...c, score };
  });

  // Sort by score desc
  return scored
    .filter(c => !q || c.score > 0.1)
    .sort((a, b) => b.score - a.score || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, context.maxResults || 10);
}

function calculateMemoryScore(candidate, query, context) {
  const text = String(candidate.content || "").toLowerCase();
  
  // 1. Semantic/Keyword Similarity (45%)
  let similarity = 0;
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    let matchCount = 0;
    words.forEach(w => {
      if (text.includes(w)) matchCount++;
    });
    similarity = matchCount / words.length;
    if (similarity === 0) return 0;
  } else {
    similarity = 1.0;
  }

  // 2. Keyword Match (20%)
  const keywordMatch = text.includes(query) ? 1.0 : 0.0;

  // 3. Recency Weight (15%)
  const ageInMs = Date.now() - new Date(candidate.createdAt).getTime();
  const ageInDays = ageInMs / (24 * 3600 * 1000);
  let recencyWeight = 0.2;
  if (ageInDays <= 1) recencyWeight = 1.0;
  else if (ageInDays <= 7) recencyWeight = 0.8;
  else if (ageInDays <= 30) recencyWeight = 0.5;

  // Boost if date ranges are specified
  if (context.timeRange) {
    // optional boost
  }

  // 4. Folder/Project Boost (15%)
  let folderOrProjectBoost = 0.3;
  if (context.currentFolderId && candidate.folderId === context.currentFolderId) {
    folderOrProjectBoost = 1.0;
  }
  if (context.currentProjectId && candidate.projectId === context.currentProjectId) {
    folderOrProjectBoost = 1.0;
  }

  // 5. User Pinned Boost (5%)
  const userPinnedBoost = candidate.pinned ? 1.0 : 0.0;

  const finalScore =
    similarity * 0.45 +
    keywordMatch * 0.20 +
    recencyWeight * 0.15 +
    folderOrProjectBoost * 0.15 +
    userPinnedBoost * 0.05;

  return Number(finalScore.toFixed(3));
}
