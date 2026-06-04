#!/usr/bin/env node
// Provenant — render a verification report to a single self-contained HTML file.
// Usage (lib): import { renderReport } from "./report.mjs"
//        (cli): node scripts/report.mjs <url|id> --analyze [--ai ...] [-o out.html]
import { writeFileSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { getTranscript } from "./get_transcript.mjs";
import { getProvenance } from "./provenance.mjs";
import { analyze } from "./analyze.mjs";
import { esc, safeUrl, loadEnv } from "./lib.mjs";

const ts = (s) => { if (!Number.isFinite(s) || s < 0) s = 0; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return (h ? h + ":" : "") + `${String(m).padStart(h ? 2 : 1, "0")}:${String(x).padStart(2, "0")}`; };
const VC = { "true": ["#15803d", "#dcfce7"], "mostly true": ["#15803d", "#dcfce7"], mixed: ["#b45309", "#fef3c7"], misleading: ["#b45309", "#fef3c7"], unverifiable: ["#52525b", "#f4f4f5"], "false": ["#b91c1c", "#fee2e2"] };

export function renderReport({ provenance: p, transcript: t, analysis: a }) {
  const words = t.words || (t.text ? t.text.split(/\s+/).length : 0);
  const txBody = t.segments
    ? t.segments.map((s) => `<p><span class="t">${ts(s.start)}</span>${esc(s.text)}</p>`).join("\n")
    : t.text.split(/(?<=[.!?]) /).reduce((acc, s, i) => { const k = Math.floor(i / 3); (acc[k] ??= []).push(s); return acc; }, []).map((g) => `<p>${esc(g.join(" "))}</p>`).join("\n");

  let A = "";
  if (a) {
    const kp = (a.keyPoints || []).map((x) => `<li>${esc(x)}</li>`).join("");
    const links = (a.keyLinks || []).map((l) => `<li><a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener nofollow">${esc(l.label || l.url)}</a>${l.note ? " — " + esc(l.note) : ""}</li>`).join("") || "<li class='muted'>—</li>";
    const fc = (a.factChecks || []).map((f) => { const [fg, bg] = VC[(f.verdict || "").toLowerCase()] || VC.unverifiable;
      const src = (f.sources || []).map((s) => `<a href="${esc(safeUrl(s))}" target="_blank" rel="noopener nofollow">source</a>`).join(" ");
      const tag = f.webChecked ? "" : (f.webError ? ' <span class="ai">web-check failed</span>' : ' <span class="ai">AI-inferred</span>');
      return `<div class="fc" style="--fg:${fg};--vbg:${bg}"><span class="v">${esc(f.verdict)}</span><p class="c">${esc(f.claim)}</p><p class="e">${esc(f.explanation)}${tag} ${src}</p></div>`; }).join("") || "<p class='muted'>No discrete claims.</p>";
    const b = a.bias || {}; const pol = b.political;
    const numScore = typeof b.score === "number" && Number.isFinite(b.score);
    const assessed = numScore || !!b.lean || typeof pol === "boolean";
    const pos = numScore ? Math.max(2, Math.min(98, 50 + b.score * 10)) : 50;
    A = `<div class="badge">Analysis</div>
<p class="lead">${esc(a.tldr)}</p>
<section><h2>Summary</h2><div class="prose"><p>${esc(a.summary)}</p></div></section>
<section><h2>Key points</h2><ul class="pts">${kp}</ul></section>
<section><h2>Links &amp; tools</h2><ul class="lk">${links}</ul></section>
<section><h2>Fact-check</h2>${fc}</section>
<section><h2>Political bias</h2><div class="bl">${assessed ? esc(b.label || (pol ? b.lean : "Non-political")) : "Bias not assessed"}</div>
<div class="meter"><div class="trk"></div><div class="dot${pol && assessed ? "" : " off"}" style="left:${pos}%"></div><div class="tk"><span>Left</span><span>Center</span><span>Right</span></div></div>
<dl class="bias"><div><dt>Political?</dt><dd>${pol ? "Yes" : "No"}</dd></div><div><dt>Lean</dt><dd>${esc(b.lean || "None")}</dd></div><div><dt>Confidence</dt><dd>${esc(b.confidence || "—")}</dd></div></dl>
<div class="prose"><p>${esc(b.evidence)}</p></div>${b.other_bias ? `<aside class="callout"><strong>Worth flagging:</strong> ${esc(b.other_bias)}</aside>` : ""}</section>
<p class="disc">Analysis by ${esc(a.provider || "AI")}; web-verified claims vs AI-inferred kept separate. Best-effort research aid, not editorial fact-checking. Bias −5 left · 0 center/none · +5 right.</p>`;
  }

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title || "Verification")} — Provenant</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#FAFAF9;--card:#fff;--ink:#0B0B0F;--ink2:#3F3F46;--muted:#78716C;--border:#E7E5E4;--soft:#F5F5F4;--accent:#4F46E5}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Inter",system-ui,sans-serif}
.wrap{max-width:680px;margin:0 auto;padding:0 22px}a{color:var(--accent);text-decoration:none}
header{padding:52px 0 30px;border-bottom:1px solid var(--border)}
.pills{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}.pill{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#fff;background:var(--ink);padding:4px 11px;border-radius:999px}.pill.g{color:var(--ink2);background:var(--soft);border:1px solid var(--border)}
h1{font-family:"Playfair Display",serif;font-weight:800;font-size:clamp(1.9rem,5.5vw,2.9rem);line-height:1.1;letter-spacing:-.015em;margin:0 0 12px}
.by{color:var(--muted);font-size:14px}.by a{color:var(--ink2);border-bottom:1px solid var(--border)}
main{padding:18px 0 80px}
.badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:24px 0 4px}
.lead{font-family:"Source Serif 4",serif;font-size:1.4rem;line-height:1.5;margin:6px 0}
section{padding:26px 0;border-top:1px solid var(--border)}section h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 14px}
.prose{font-family:"Source Serif 4",serif;font-size:1.1rem;line-height:1.7;color:var(--ink2)}.prose p{margin:0 0 1em}
ul.pts{font-family:"Source Serif 4",serif;font-size:1.08rem;list-style:none;margin:0;padding:0}ul.pts li{position:relative;padding:0 0 12px 24px}ul.pts li:before{content:"";position:absolute;left:3px;top:10px;width:7px;height:7px;border-radius:50%;background:var(--accent)}
ul.lk{list-style:none;margin:0;padding:0}ul.lk li{padding:11px 0;border-bottom:1px solid var(--border)}ul.lk a{font-weight:600}
.fc{background:var(--card);border:1px solid var(--border);border-left:4px solid var(--fg);border-radius:10px;padding:15px 17px;margin:0 0 12px}
.fc .v{display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--fg);background:var(--vbg);padding:3px 9px;border-radius:6px;margin-bottom:8px}
.fc .c{font-family:"Source Serif 4",serif;font-weight:600;font-size:1.06rem;margin:0 0 5px}.fc .e{font-size:.95rem;color:var(--ink2);margin:0}.fc .e a{font-size:.82rem;margin-left:6px;border-bottom:1px solid var(--border)}
.ai{font-size:.72rem;background:#f4f4f5;color:#78716c;padding:1px 6px;border-radius:4px}
.bl{font-family:"Playfair Display",serif;font-size:1.4rem;font-weight:700;margin-bottom:14px}
.meter{margin:4px 0 18px}.trk{height:7px;border-radius:6px;background:linear-gradient(90deg,#3b82f6,#e7e5e4 48%,#e7e5e4 52%,#ef4444)}
.dot{position:relative;top:-11px;width:18px;height:18px;border-radius:50%;background:var(--ink);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25);transform:translateX(-50%)}.dot.off{background:#a8a29e}
.tk{display:flex;justify-content:space-between;font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;margin-top:2px}
dl.bias{margin:0 0 12px;border-top:1px solid var(--border)}dl.bias>div{display:flex;padding:7px 0;border-bottom:1px solid var(--border)}dl.bias dt{flex:0 0 120px;color:var(--muted);font-size:.9rem;margin:0}dl.bias dd{margin:0;font-weight:500;font-size:.95rem}
.callout{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 15px;font-size:.93rem;color:#78350f;margin-top:12px}
.disc{font-size:12px;color:var(--muted);margin-top:18px}.muted{color:var(--muted)}
details{border-top:1px solid var(--border);margin-top:6px}summary{cursor:pointer;list-style:none;padding:24px 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}summary::-webkit-details-marker{display:none}
.tx{font-family:"Source Serif 4",serif;font-size:1.12rem;line-height:1.75;color:var(--ink2);padding-top:12px}.tx p{margin:0 0 .9em}.tx .t{display:inline-block;min-width:52px;color:var(--accent);font-family:"Inter";font-size:.8rem;font-weight:600;vertical-align:top}
footer{text-align:center;color:var(--muted);font-size:12px;padding:0 22px 50px}
</style></head><body>
<header><div class="wrap">
<div class="pills">${p.source?.length ? '<span class="pill">Source identified</span>' : '<span class="pill" style="background:#b91c1c">Provenance unverified</span>'}${a ? '<span class="pill">Analyzed</span>' : ""}<span class="pill g">${words.toLocaleString()} words</span>${t.hasTimestamps ? '<span class="pill g">timestamped</span>' : ""}</div>
<h1>${esc(p.title || "(untitled)")}</h1>
<p class="by">${esc(p.channel || "")}${p.publishedAt ? " · " + esc(String(p.publishedAt).slice(0, 10)) : ""} · <a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener nofollow">source</a></p>
</div></header>
<main><div class="wrap">
${A}
<details${a ? "" : " open"}><summary>Full transcript</summary><div class="tx">${txBody}</div></details>
</div></main>
<footer>Provenant · ${t.source}${a ? " + " + esc(a.provider) : ""}</footer>
</body></html>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  loadEnv(import.meta.url); // shell-exported vars take precedence
  const input = args.find((x) => !x.startsWith("-"));
  const id = input?.match(/[A-Za-z0-9_-]{11}/)?.[0];
  // constrain output to a .html file in the current directory (no path traversal)
  let out = args.includes("-o") ? basename(args[args.indexOf("-o") + 1] || "") : `${id || "report"}.html`;
  if (!out || out === ".") out = `${id || "report"}.html`;
  if (!out.toLowerCase().endsWith(".html")) out += ".html";
  if (!id) { console.log("Usage: report.mjs <url|id> [--analyze | --analysis-file a.json] [--ai ...] [-o out.html] [--publish [--publish-dir <dir>]]"); process.exit(1); }
  const [provenance, transcript] = await Promise.all([
    getProvenance(id, { youtubeKey: process.env.YOUTUBE_API_KEY }),
    getTranscript(id, { supadataKey: process.env.SUPADATA_API_KEY })]);
  let analysis = null;
  if (args.includes("--analysis-file")) {
    // Preferred: the host agent did the web-verified analysis and hands it in as JSON.
    const af = args[args.indexOf("--analysis-file") + 1];
    try { analysis = JSON.parse(readFileSync(af, "utf8")); }
    catch (e) { console.error(`error: could not read --analysis-file "${af}": ${e.message}`); process.exit(1); }
  } else if (args.includes("--analyze")) {
    // Autonomous fallback: let the bundled analyzer do it (claude-cli by default).
    const provider = args.includes("--ai") ? args[args.indexOf("--ai") + 1] : undefined;
    analysis = await analyze({ meta: provenance, text: transcript.text }, { provider, anthropicKey: process.env.ANTHROPIC_API_KEY, openaiKey: process.env.OPENAI_API_KEY, tavilyKey: process.env.TAVILY_API_KEY });
  }
  const html = renderReport({ provenance, transcript, analysis });
  writeFileSync(out, html);
  console.log(`report → ${out}`);

  // Publish: copy the report into the configured site dir and (VPS-aware) deploy it.
  // Triggered by --publish, or always when PROVENANT_PUBLISH=1 (set it in .env to
  // make every run publish without passing the flag).
  if (args.includes("--publish") || process.env.PROVENANT_PUBLISH === "1") {
    const { publish } = await import("./publish.mjs");
    const dir = args.includes("--publish-dir") ? args[args.indexOf("--publish-dir") + 1] : undefined;
    const r = await publish({ html, id, dir }); // pass the rendered HTML directly — no re-read
    if (r.url) {
      console.log(`published → ${r.url}`);
      if (r.archive?.ok) console.log(`archived  → ${r.archive.url}`);
      else if (r.archive) console.log(`archive   → not captured (${r.archive.reason}); save manually: ${r.archive.manual}`);
    } else {
      console.log(`not published (${r.reason})${r.page ? `\nlocal: ${r.page}` : ""}`);
      if (r.log) console.error(`\n${r.log}`);
    }
  }
}
