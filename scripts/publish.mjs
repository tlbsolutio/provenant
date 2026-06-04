#!/usr/bin/env node
// Provenant — publish a rendered report to an accessible HTTPS page (+ optional archive).
// VPS-aware: a datacenter localhost isn't web-reachable, so when a Vercel target
// is available this deploys there and prints the public URL. With no target it
// just leaves the file on disk and tells you where it is — never pretends to publish.
//
// Usage (cli): node scripts/publish.mjs <htmlFile> [--id <id>] [--dir <publishDir>]
// Usage (lib): import { publish } from "./publish.mjs"  // async
//
// Config (all optional, via env or .env):
//   PROVENANT_PUBLISH_DIR   directory served as the site (e.g. ~/my-site). Default: none.
//   PROVENANT_VERCEL=1      force a `vercel deploy` even if the dir isn't linked yet.
//   PROVENANT_ARCHIVE=0     skip the Wayback Machine snapshot of the published URL.
//   ARCHIVE_ORG_ACCESS_KEY / ARCHIVE_ORG_SECRET_KEY   authenticated Save Page Now.
// A dir already linked to Vercel (has .vercel/project.json) deploys automatically.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, basename } from "node:path";
import { execFileSync } from "node:child_process";

const expand = (p) => (p && p.startsWith("~/") ? join(homedir(), p.slice(2)) : p);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function hasVercelCli() {
  try { execFileSync("vercel", ["--version"], { stdio: "ignore" }); return true; } catch { return false; }
}

// Rebuild a simple, dependency-free index listing every published page (title from <title>).
function regenIndex(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".html") && f !== "index.html");
  const rows = files.map((f) => {
    let title = f;
    try { const m = readFileSync(join(dir, f), "utf8").match(/<title>([^<]*)<\/title>/i); if (m) title = m[1].replace(/\s*[—-]\s*Provenant.*$/i, "").trim() || f; } catch { /* keep filename */ }
    return `<li><a href="./${esc(f)}">${esc(title)}</a></li>`;
  }).join("\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Provenant — verified sources</title>
<style>body{margin:0;background:#FAFAF9;color:#0B0B0F;font:16px/1.6 system-ui,-apple-system,sans-serif}.w{max-width:680px;margin:0 auto;padding:56px 22px}h1{font-family:Georgia,serif;font-size:1.9rem;margin:0 0 6px}p{color:#78716C;margin:0 0 8px}ul{list-style:none;padding:0;margin:24px 0 0}li{padding:14px 0;border-top:1px solid #E7E5E4}a{color:#4F46E5;text-decoration:none;font-weight:600}a:hover{text-decoration:underline}</style>
</head><body><div class="w"><h1>Verified sources</h1><p>Transcript · provenance · fact-check · bias — by Provenant.</p><ul>${rows || '<li class="muted">No reports yet.</li>'}</ul></div></body></html>`;
  writeFileSync(join(dir, "index.html"), html);
}

// Submit a PUBLIC url to the Wayback Machine. Best-effort, non-fatal. archive.org
// frequently blocks datacenter IPs, so on failure we hand back the manual save URL —
// open it from any non-blocked client (your browser) to capture the snapshot.
async function archiveUrl(url, { accessKey, secretKey } = {}) {
  const save = `https://web.archive.org/save/${url}`;
  const headers = { "User-Agent": "provenant", Accept: "application/json" };
  if (accessKey && secretKey) headers.Authorization = `LOW ${accessKey}:${secretKey}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(save, { method: "POST", headers, body: `url=${encodeURIComponent(url)}`, signal: ctrl.signal });
    if (res.ok || res.status === 302) {
      const loc = res.headers.get("content-location") || "";
      return { ok: true, url: loc.startsWith("/web/") ? `https://web.archive.org${loc}` : `https://web.archive.org/web/*/${url}` };
    }
    return { ok: false, reason: `archive.org returned ${res.status} (datacenter IPs are often blocked)`, manual: save };
  } catch (e) {
    return { ok: false, reason: e.name === "AbortError" ? "timeout" : e.message, manual: save };
  } finally {
    clearTimeout(timer);
  }
}

export async function publish({ htmlPath, html, id, dir } = {}) {
  if (!html && htmlPath) html = readFileSync(htmlPath, "utf8");
  if (!html) throw new Error("publish: need `html` or `htmlPath`");
  id = String(id || basename(htmlPath || "report", ".html")).replace(/[^A-Za-z0-9_-]/g, "") || "report";

  const publishDir = expand(dir || process.env.PROVENANT_PUBLISH_DIR || "");
  if (!publishDir) {
    return { url: null, dir: null, deployed: false, reason: "no publish target (set PROVENANT_PUBLISH_DIR or pass --dir)" };
  }

  const root = resolve(publishDir);
  mkdirSync(root, { recursive: true });
  const page = join(root, `${id}.html`);
  writeFileSync(page, html);
  regenIndex(root);

  const linked = existsSync(join(root, ".vercel", "project.json"));
  const wantVercel = linked || process.env.PROVENANT_VERCEL === "1";
  if (!(wantVercel && hasVercelCli())) {
    return {
      url: null, dir: root, page, deployed: false,
      reason: hasVercelCli()
        ? "wrote file but did not deploy (link the dir to Vercel, or set PROVENANT_VERCEL=1)"
        : "wrote file but no Vercel CLI found — copy it to a web host to make it accessible",
    };
  }

  // Prefer the stable project alias (<project>.vercel.app) over the per-deploy URL.
  let stable = "";
  try { stable = JSON.parse(readFileSync(join(root, ".vercel", "project.json"), "utf8")).projectName; } catch { /* not linked yet */ }
  let out = "";
  try { out = execFileSync("vercel", ["deploy", "--prod", "--yes"], { cwd: root, encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + "\n" + (e.stderr || ""); }
  const deployUrl = (out.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/i) || [])[0];
  const base = stable ? `https://${stable}.vercel.app` : deployUrl;
  if (!base) return { url: null, dir: root, page, deployed: false, reason: "vercel deploy returned no URL", log: out.slice(-400) };

  const result = { url: `${base}/${id}.html`, indexUrl: `${base}/`, dir: root, deployed: true };

  // Archive the now-public URL (default on; PROVENANT_ARCHIVE=0 to skip).
  if (process.env.PROVENANT_ARCHIVE !== "0") {
    result.archive = await archiveUrl(result.url, { accessKey: process.env.ARCHIVE_ORG_ACCESS_KEY, secretKey: process.env.ARCHIVE_ORG_SECRET_KEY });
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2);
  const f = a.find((x) => !x.startsWith("-"));
  const get = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  if (!f) { console.log("Usage: publish.mjs <htmlFile> [--id <id>] [--dir <publishDir>]"); process.exit(1); }
  const r = await publish({ htmlPath: f, id: get("--id"), dir: get("--dir") });
  if (r.url) {
    console.log(`published → ${r.url}`);
    if (r.archive?.ok) console.log(`archived  → ${r.archive.url}`);
    else if (r.archive) console.log(`archive   → not captured (${r.archive.reason}); save manually: ${r.archive.manual}`);
  } else {
    console.log(`not deployed (${r.reason})${r.page ? `\nlocal: ${r.page}` : ""}`);
  }
}
