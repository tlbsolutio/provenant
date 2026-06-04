#!/usr/bin/env node
// Provenant — universal transcript fetcher. AI-agnostic, key-optional.
//
// Order of attempts (first that works wins):
//   1. Supadata API   — if SUPADATA_API_KEY set. Timestamped. Works on any IP.
//   2. Headless browser (Playwright) — opens the real YouTube page and scrapes
//      the transcript panel. TIMESTAMPED, no key. Works wherever a browser can
//      reach YouTube (i.e. most local machines; datacenter IPs may be bot-walled).
//   3. kome.ai API    — no key, plain text (no timestamps). Last-resort fallback.
//
// Usage: node scripts/get_transcript.mjs <youtube-url|id> [--json] [--no-browser]
// Returns/-prints { source, hasTimestamps, words, segments?, text }.

export function parseVideoId(input) {
  const m = String(input || "").match(/[A-Za-z0-9_-]{11}/);
  return m ? m[0] : null;
}
const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();

async function viaSupadata(id, key) {
  const r = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${id}&text=false`, {
    headers: { "x-api-key": key },
  });
  if (!r.ok) throw new Error(`supadata ${r.status}`);
  const d = await r.json();
  const segments = (d.content || []).map((s) => ({
    start: (s.offset ?? 0) / 1000, end: ((s.offset ?? 0) + (s.duration ?? 0)) / 1000, text: clean(s.text),
  }));
  return { source: "supadata", hasTimestamps: true, segments, text: clean(segments.map((s) => s.text).join(" ")) };
}

async function viaBrowser(id) {
  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch { throw new Error("playwright not installed (run: npx playwright install chromium)"); }
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ locale: "en-US" });
    await page.goto(`https://www.youtube.com/watch?v=${id}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    // consent wall (EU)
    for (const sel of ['button[aria-label*="Accept" i]', 'button:has-text("Accept all")', 'form[action*="consent"] button']) {
      const b = await page.$(sel); if (b) { await b.click().catch(() => {}); await page.waitForTimeout(800); break; }
    }
    await page.waitForTimeout(1500);
    // expand description, then open transcript
    for (const sel of ['tp-yt-paper-button#expand', '#description #expand', 'ytd-text-inline-expander #expand']) {
      const b = await page.$(sel); if (b) { await b.click().catch(() => {}); await page.waitForTimeout(500); }
    }
    let opened = false;
    for (const sel of ['button[aria-label="Show transcript"]', 'button:has-text("Show transcript")',
                        'ytd-button-renderer:has-text("Show transcript")']) {
      const b = await page.$(sel); if (b) { await b.click().catch(() => {}); opened = true; break; }
    }
    if (!opened) throw new Error("transcript button not found");
    await page.waitForSelector("ytd-transcript-segment-renderer", { timeout: 15000 });
    const segments = await page.$$eval("ytd-transcript-segment-renderer", (els) =>
      els.map((el) => {
        const t = el.querySelector(".segment-timestamp")?.textContent?.trim() || "0:00";
        const text = el.querySelector(".segment-text")?.textContent?.trim() || "";
        const p = t.split(":").map(Number);
        const start = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0);
        return { start, text };
      }).filter((s) => s.text));
    if (!segments.length) throw new Error("no transcript segments scraped");
    return { source: "youtube (headless browser)", hasTimestamps: true, segments,
             text: clean(segments.map((s) => s.text).join(" ")) };
  } finally { await browser.close(); }
}

async function viaKome(id) {
  const r = await fetch("https://kome.ai/api/transcript", {
    method: "POST", headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: JSON.stringify({ video_id: id, format: true }),
  });
  if (!r.ok) throw new Error(`kome.ai ${r.status}`);
  const text = clean((await r.json()).transcript);
  if (!text) throw new Error("kome.ai empty");
  return { source: "kome.ai", hasTimestamps: false, segments: null, text };
}

export async function getTranscript(input, opts = {}) {
  const id = parseVideoId(input);
  if (!id) throw new Error(`could not parse video id from: ${input}`);
  const attempts = [];
  if (opts.supadataKey) attempts.push(() => viaSupadata(id, opts.supadataKey));
  if (opts.browser !== false) attempts.push(() => viaBrowser(id));
  attempts.push(() => viaKome(id));
  let lastErr;
  for (const fn of attempts) {
    try { const r = await fn(); return { videoId: id, words: r.text.split(/\s+/).length, ...r }; }
    catch (e) { lastErr = e; console.error(`[transcript] ${e.message}`); }
  }
  throw lastErr || new Error("all transcript methods failed");
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const input = args.find((a) => !a.startsWith("--"));
  if (!input) { console.log("Usage: get_transcript.mjs <url|id> [--json] [--no-browser]"); process.exit(1); }
  try {
    const r = await getTranscript(input, {
      supadataKey: process.env.SUPADATA_API_KEY || undefined,
      browser: !args.includes("--no-browser"),
    });
    if (args.includes("--json")) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`\n${r.words} words via ${r.source}${r.hasTimestamps ? " (timestamped)" : " (plain text)"}\n`);
      if (r.segments) r.segments.slice(0, 6).forEach((s) => console.log(`[${Math.floor(s.start/60)}:${String(Math.floor(s.start%60)).padStart(2,"0")}] ${s.text}`));
      else console.log(r.text.slice(0, 280) + "…");
    }
  } catch (e) { console.error(`provenant: ${e.message}`); process.exit(1); }
}
