import fs from "node:fs/promises";
import path from "node:path";

export function validateSkillName(name) {
  if (!name || typeof name !== "string") {
    throw new Error("Skill name must be a non-empty string.");
  }
  if (name.includes("..")) {
    throw new Error("Path traversal is not allowed in skill names.");
  }
  const validNameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!validNameRegex.test(name)) {
    throw new Error(`Invalid skill name '${name}'. Only alphanumeric characters, dashes, and underscores are allowed.`);
  }
}

export function skillsDir(workspaceRoot) {
  return path.join(workspaceRoot, ".ai-workspace", "skills");
}

export async function listSkills(workspaceRoot) {
  const dir = skillsDir(workspaceRoot);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}

  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const list = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      validateSkillName(entry.name);
      const skill = await readSkill(workspaceRoot, entry.name);
      list.push(skill);
    } catch (err) {
      // Skip invalid skills
    }
  }
  return list;
}

export async function readSkill(workspaceRoot, name) {
  validateSkillName(name);
  const dir = skillsDir(workspaceRoot);
  const skillPath = path.join(dir, name);
  const configPath = path.join(skillPath, "config.json");
  const mdPath = path.join(skillPath, "skill.md");

  let config = { name, enabled: false, triggers: [], taskTypes: [] };
  try {
    const configText = await fs.readFile(configPath, "utf8");
    config = { ...config, ...JSON.parse(configText) };
  } catch {
    // Return default config if config.json is missing or corrupt
  }

  let skillMd = "";
  try {
    skillMd = await fs.readFile(mdPath, "utf8");
  } catch {
    // Empty md if missing
  }

  return {
    name,
    config,
    skillMd
  };
}

export async function enableSkill(workspaceRoot, name, enabled = true) {
  validateSkillName(name);
  const skill = await readSkill(workspaceRoot, name);
  skill.config.enabled = Boolean(enabled);

  const dir = skillsDir(workspaceRoot);
  const configPath = path.join(dir, name, "config.json");
  await fs.writeFile(configPath, JSON.stringify(skill.config, null, 2) + "\n", "utf8");
  return skill;
}

export async function addSkill(workspaceRoot, sourcePath) {
  const sourceName = path.basename(sourcePath);
  let name = sourceName;

  // Let's try reading name from config.json inside sourcePath if it exists
  try {
    const configText = await fs.readFile(path.join(sourcePath, "config.json"), "utf8");
    const json = JSON.parse(configText);
    if (json.name) {
      name = json.name;
    }
  } catch {}

  validateSkillName(name);
  const destDir = path.join(skillsDir(workspaceRoot), name);
  await fs.mkdir(destDir, { recursive: true });

  // Copy contents recursively
  await fs.cp(sourcePath, destDir, { recursive: true });

  // Ensure config.json is updated with correct name
  const skill = await readSkill(workspaceRoot, name);
  skill.config.name = name;
  await fs.writeFile(path.join(destDir, "config.json"), JSON.stringify(skill.config, null, 2) + "\n", "utf8");

  return skill;
}

export async function removeSkill(workspaceRoot, name) {
  validateSkillName(name);
  const destDir = path.join(skillsDir(workspaceRoot), name);
  await fs.rm(destDir, { recursive: true, force: true });
}
