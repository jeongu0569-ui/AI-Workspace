import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function auditLogPath(workspaceRoot) {
  return path.join(workspaceRoot, ".ai-workspace", "audit", "audit.jsonl");
}

export async function appendAuditEvent(workspaceRoot, event = {}) {
  const filePath = auditLogPath(workspaceRoot);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const record = {
    id: `audit-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...event
  };
  await fs.appendFile(filePath, JSON.stringify(record) + "\n", "utf8");
  return record;
}

export async function readAuditSummary(workspaceRoot, { limit = 500 } = {}) {
  const filePath = auditLogPath(workspaceRoot);
  let lines = [];
  try {
    lines = (await fs.readFile(filePath, "utf8")).trim().split("\n").filter(Boolean);
  } catch {
    return {
      path: ".ai-workspace/audit/audit.jsonl",
      total: 0,
      recentDenied: 0,
      recentApprovalRequired: 0,
      recentApproved: 0,
      recentRejected: 0
    };
  }
  const recent = lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
  return {
    path: ".ai-workspace/audit/audit.jsonl",
    total: lines.length,
    recentDenied: recent.filter((item) => item.status === "denied" || item.status === "deny").length,
    recentApprovalRequired: recent.filter((item) => item.status === "approval_required" || item.status === "approve").length,
    recentApproved: recent.filter((item) => item.status === "approved").length,
    recentRejected: recent.filter((item) => item.status === "rejected").length
  };
}
