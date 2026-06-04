#!/usr/bin/env node
// Provenant — AI analysis (summary, key points, key links, fact-check, bias).
// Provider-agnostic, key-optional:
//   --ai claude-cli  (default) -> local Claude Code headless: your subscription, no API key
//   --ai anthropic              -> ANTHROPIC_API_KEY
//   --ai openai                 -> OPENAI_API_KEY
// If TAVILY_API_KEY is set, fact-check claims get real web sources attached.
//
// Usage: node scripts/analyze.mjs <url|id> [--ai claude-cli|anthropic|openai]
import { spawn } from "node:child_process";
import { getTranscript } from "./get_transcript.mjs";
import { getProvenance } from "./provenance.mjs";

const SCHEMA = `{
 "tldr":"one plain sentence",
 "summary":"2-4 neutral sentences",
 "keyPoints":["6-10 concrete points"],
 "keyLinks":[{"label":"tool/resource named in the video","url":"official url","note":"why"}],
 "factChecks":[{"claim":"a concrete checkable claim (not opinion)","verdict":"True|Mostly True|Mixed|Misleading|False|Unverifiable","explanation":"reasoning","query":"web query that would verify it"}],
 "bias":{"political":false,"topic":"","lean":"Left|Center-left|Center|Center-right|Right|None","score":null,"label":"","confidence":"","evidence":"","other_bias":"non-political slants e.g. commercial/promotional"}
}`;

function prompt(meta, text) {
  return `You are a neutral media-literacy analyst. Return ONLY a JSON object (no markdown) matching:
${SCHEMA}
Rules: neutral, evidence-based. Only CONCRETE checkable claims (skip opinions/marketing); give a "query" to verify each. bias.score: -5 left..0 center/none..+5 right, null if non-political; keep political lean separate from commercial bias (other_bias). keyLinks: real official URLs only, omit if unknown.

Title: ${meta.title || "?"} | Channel: ${meta.channel || "?"}
TRANSCRIPT:
${text}`;
}
const grabJson = (s) => { const a = s.indexOf("{"), b = s.lastIndexOf("}"); if (a < 0 || b < 0) throw new Error("no JSON in AI output"); return JSON.parse(s.slice(a, b + 1)); };

const runClaudeCli = (p) => new Promise((res, rej) => {
  const c = spawn("claude", ["-p", p], { stdio: ["ignore", "pipe", "pipe"] });
  let out = "", err = ""; const to = setTimeout(() => { c.kill(); rej(new Error("claude-cli timeout")); }, 240000);
  c.stdout.on("data", (d) => (out += d)); c.stderr.on("data", (d) => (err += d));
  c.on("close", (code) => { clearTimeout(to); out.trim() ? res(out) : rej(new Error(`claude-cli ${code}: ${err.slice(0, 200)}`)); });
});

async function runApi(provider, p, key) {
  if (provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4096, messages: [{ role: "user", content: p }] }) });
    if (!r.ok) throw new Error(`anthropic ${r.status}`);
    return (await r.json()).content.map((c) => c.text).join("");
  }
  const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o", response_format: { type: "json_object" }, messages: [{ role: "user", content: p }] }) });
  if (!r.ok) throw new Error(`openai ${r.status}`);
  return (await r.json()).choices[0].message.content;
}

async function tavily(fcs, key) {
  for (const f of fcs) {
    if (!f.query) continue;
    try {
      const r = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ api_key: key, query: f.query, max_results: 3, search_depth: "advanced" }) });
      if (r.ok) { f.sources = ((await r.json()).results || []).slice(0, 3).map((x) => x.url); f.webChecked = true; }
    } catch {}
    delete f.query;
  }
}

export async function analyze({ meta, text }, opts = {}) {
  const provider = opts.provider || (opts.anthropicKey ? "anthropic" : opts.openaiKey ? "openai" : "claude-cli");
  const p = prompt(meta, text);
  const raw = provider === "claude-cli" ? await runClaudeCli(p) : await runApi(provider, p, opts.anthropicKey || opts.openaiKey);
  const a = grabJson(raw); a.provider = provider;
  if (a.factChecks?.length && opts.tavilyKey) await tavily(a.factChecks, opts.tavilyKey);
  else (a.factChecks || []).forEach((f) => delete f.query);
  return a;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const input = args.find((a) => !a.startsWith("-"));
  const provider = (args[args.indexOf("--ai") + 1] && args.includes("--ai")) ? args[args.indexOf("--ai") + 1] : undefined;
  if (!input) { console.log("Usage: analyze.mjs <url|id> [--ai claude-cli|anthropic|openai]"); process.exit(1); }
  const id = input.match(/[A-Za-z0-9_-]{11}/)?.[0];
  const [meta, t] = await Promise.all([getProvenance(id, { youtubeKey: process.env.YOUTUBE_API_KEY }), getTranscript(id, { supadataKey: process.env.SUPADATA_API_KEY })]);
  const a = await analyze({ meta, text: t.text }, {
    provider, anthropicKey: process.env.ANTHROPIC_API_KEY, openaiKey: process.env.OPENAI_API_KEY, tavilyKey: process.env.TAVILY_API_KEY });
  console.log(JSON.stringify(a, null, 2));
}
