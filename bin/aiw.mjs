#!/usr/bin/env node
process.env.CODMES_LEGACY_COMMAND = process.env.CODMES_LEGACY_COMMAND || "aiw";
await import("./codmes.mjs");
