import fs from "node:fs/promises";
import path from "node:path";

export async function archiveExpiredSessions(workspaceRoot, options = {}) {
  const thresholdDays = options.thresholdDays || 30;
  const sessionsDir = path.join(workspaceRoot, ".ai-workspace", "sessions");
  
  let files = [];
  try {
    files = await fs.readdir(sessionsDir);
  } catch {
    return { archivedCount: 0 };
  }
  
  const now = Date.now();
  const thresholdMs = thresholdDays * 24 * 3600 * 1000;
  let archivedCount = 0;
  
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(sessionsDir, file);
    try {
      const data = await fs.readFile(filePath, "utf8");
      const session = JSON.parse(data);
      
      if (isArchiveExempt(session)) continue;
      
      const lastTime = new Date(session.updatedAt || session.createdAt || 0).getTime();
      if (now - lastTime > thresholdMs) {
        session.archivedAt = new Date().toISOString();
        session.visibleInSidebar = false;
        session.archiveReason = "older_than_30_days";
        
        await fs.writeFile(filePath, JSON.stringify(session, null, 2), "utf8");
        archivedCount++;
        
        // Re-index session
        const { indexSession } = await import("./conversation-index.mjs");
        await indexSession(workspaceRoot, session);
      }
    } catch {}
  }
  
  return { archivedCount };
}

export function isArchiveExempt(session) {
  // Exception list:
  // - Project connected
  // - Folder connected
  // - Starred/Pinned
  // - Active task / approval pending (custom settings check if needed, but project/folder/pinned are main)
  if (session.projectId) return true;
  if (session.folderId) return true;
  if (session.pinned) return true;
  if (session.kind === "project" || session.kind === "folder") return true;
  return false;
}

export async function listArchivedSessions(workspaceRoot) {
  const sessionsDir = path.join(workspaceRoot, ".ai-workspace", "sessions");
  let files = [];
  try {
    files = await fs.readdir(sessionsDir);
  } catch {
    return [];
  }
  
  const archived = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(sessionsDir, file);
    try {
      const data = await fs.readFile(filePath, "utf8");
      const session = JSON.parse(data);
      if (session.archivedAt) {
        archived.push(session);
      }
    } catch {}
  }
  
  return archived.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

export async function archiveSession(workspaceRoot, sessionId) {
  const filePath = path.join(workspaceRoot, ".ai-workspace", "sessions", `${sessionId}.json`);
  let session = null;
  try {
    const data = await fs.readFile(filePath, "utf8");
    session = JSON.parse(data);
  } catch {
    throw new Error(`Session with id ${sessionId} not found`);
  }
  
  session.archivedAt = new Date().toISOString();
  session.visibleInSidebar = false;
  
  await fs.writeFile(filePath, JSON.stringify(session, null, 2), "utf8");
  
  // Re-index session
  const { indexSession } = await import("./conversation-index.mjs");
  await indexSession(workspaceRoot, session);
  
  return session;
}

export async function unarchiveSession(workspaceRoot, sessionId) {
  const filePath = path.join(workspaceRoot, ".ai-workspace", "sessions", `${sessionId}.json`);
  let session = null;
  try {
    const data = await fs.readFile(filePath, "utf8");
    session = JSON.parse(data);
  } catch {
    throw new Error(`Session with id ${sessionId} not found`);
  }
  
  session.archivedAt = null;
  session.visibleInSidebar = true;
  
  await fs.writeFile(filePath, JSON.stringify(session, null, 2), "utf8");
  
  // Re-index session
  const { indexSession } = await import("./conversation-index.mjs");
  await indexSession(workspaceRoot, session);
  
  return session;
}
