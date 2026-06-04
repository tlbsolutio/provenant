// Shared helpers for the Provenant scripts. Kept tiny on purpose — this is a
// 4-script skill, not a framework.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// HTML-escape untrusted text before it lands in the page.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// AI-supplied links must be http(s) only — block javascript:/data: etc.
export const safeUrl = (u) => { try { return /^https?:$/.test(new URL(u).protocol) ? String(u) : "#"; } catch { return "#"; } };

// Expand a leading ~/ to the home directory (env vars don't do it for us).
export const expandHome = (p) => (p && p.startsWith("~/") ? join(homedir(), p.slice(2)) : p);

// Load KEY=VALUE pairs from the .env next to the scripts (repo root). Zero-dep.
// Shell-exported vars take precedence; comments and blank lines are ignored.
// Pass the caller's import.meta.url so the path resolves relative to the scripts dir.
export function loadEnv(metaUrl) {
  try {
    for (const line of readFileSync(new URL("../.env", metaUrl), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch { /* no .env — fine */ }
}
