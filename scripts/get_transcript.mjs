#!/usr/bin/env node
// Provenant — universal transcript fetcher. Zero install, zero key by default.
//
// Default (nothing to install): kome.ai → plain-text transcript. Just needs Node 18+.
// Optional, if Playwright is present: a headless browser scrapes the real YouTube
//   transcript panel → TIMESTAMPED segments, no key. Auto-used when available.
// Optional, with SUPADATA_API_KEY: timestamped segments on any IP.
//
// Usage: node scripts/get_transcript.mjs <youtube-url|id> [--json] [--no-browser] [-v]

export function parseVideoId(input) {
  const m = String(input || "").match(/[A-Za-z0-9_-]{11}/);
  return m ? m[0] : null;
}
const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
let _pw; const hasPlaywright = async () => {
  if (_pw === undefined) { try { _pw = (await import("playwright")).chromium; } catch { _pw = null; } }
  return _pw;
};

async function viaSupadata(id, key) {
  const r = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${id}&text=false`, { headers: { "x-api-key": key } });
  if (!r.ok) throw new Error(`supadata ${r.status}`);
  const segs = ((await r.json()).content || []).map((s) => ({
    start: (s.offset ?? 0) / 1000, end: ((s.offset ?? 0) + (s.duration ?? 0)) / 1000, text: clean(s.text) }));
  return { source: "supadata", hasTimestamps: true, segments: segs, text: clean(segs.map((s) => s.text).join(" ")) };
}

async function viaBrowser(id) {
  const chromium = await hasPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ locale: "en-US" });
    await page.goto(`https://www.youtube.com/watch?v=${id}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    for (const s of ['button[aria-label*="Accept" i]', 'button:has-text("Accept all")', 'form[action*="consent"] button']) {
      const b = await page.$(s); if (b) { await b.click().catch(() => {}); await page.waitForTimeout(800); break; }
    }
    await page.waitForTimeout(1500);
    for (const s of ['tp-yt-paper-button#expand', '#description #expand', 'ytd-text-inline-expander #expand']) {
      const b = await page.$(s); if (b) { await b.click().catch(() => {}); await page.waitForTimeout(400); }
    }
    let opened = false;
    for (const s of ['button[aria-label="Show transcript"]', 'button:has-text("Show transcript")', 'ytd-button-renderer:has-text("Show transcript")']) {
      const b = await page.$(s); if (b) { await b.click().catch(() => {}); opened = true; break; }
    }
    if (!opened) throw new Error("transcript button not found");
    await page.waitForSelector("ytd-transcript-segment-renderer", { timeout: 15000 });
    const segs = await page.$$eval("ytd-transcript-segment-renderer", (els) => els.map((el) => {
      const t = el.querySelector(".segment-timestamp")?.textContent?.trim() || "0:00";
      const text = el.querySelector(".segment-text")?.textContent?.trim() || "";
      const p = t.split(":").map(Number);
      return { start: p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+(p[1]||0), text };
    }).filter((s) => s.text));
    if (!segs.length) throw new Error("no segments scraped");
    return { source: "youtube (headless)", hasTimestamps: true, segments: segs, text: clean(segs.map((s) => s.text).join(" ")) };
  } finally { await browser.close(); }
}

async function viaKome(id) {
  const r = await fetch("https://kome.ai/api/transcript", {
    method: "POST", headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: JSON.stringify({ video_id: id, format: true }) });
  if (!r.ok) throw new Error(`kome.ai ${r.status}`);
  const text = clean((await r.json()).transcript);
  if (!text) throw new Error("kome.ai empty");
  // reject error pages / blocked responses masquerading as a transcript
  if (text.split(/\s+/).length < 5) throw new Error("kome.ai returned suspiciously short text");
  if (/sign in to confirm|video unavailable|enable javascript|are you a robot|captcha/i.test(text))
    throw new Error("kome.ai returned an error page, not a transcript");
  return { source: "kome.ai", hasTimestamps: false, segments: null, text };
}

export async function getTranscript(input, opts = {}) {
  const id = parseVideoId(input);
  if (!id) throw new Error(`could not parse video id from: ${input}`);
  const attempts = [];
  if (opts.supadataKey) attempts.push(() => viaSupadata(id, opts.supadataKey));
  if (opts.browser !== false && (await hasPlaywright())) attempts.push(() => viaBrowser(id));
  attempts.push(() => viaKome(id));
  const errs = [];
  for (const fn of attempts) {
    try { const r = await fn(); return { videoId: id, words: r.text.split(/\s+/).length, ...r }; }
    catch (e) { errs.push(e.message); if (opts.verbose) console.error(`[transcript] ${e.message}`); }
  }
  // surface every failure cause, so "no captions" is distinguishable from "all providers blocked"
  throw Object.assign(new Error(`all transcript methods failed: ${errs.join(" | ")}`), { attempts: errs });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const input = args.find((a) => !a.startsWith("-"));
  if (!input) { console.log("Usage: get_transcript.mjs <url|id> [--json] [--no-browser] [-v]"); process.exit(1); }
  try {
    const r = await getTranscript(input, {
      supadataKey: process.env.SUPADATA_API_KEY || undefined,
      browser: !args.includes("--no-browser"), verbose: args.includes("-v"),
    });
    if (args.includes("--json")) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`\n${r.words} words via ${r.source}${r.hasTimestamps ? " (timestamped)" : ""}\n`);
      if (r.segments) r.segments.slice(0, 6).forEach((s) => console.log(`[${Math.floor(s.start/60)}:${String(Math.floor(s.start%60)).padStart(2,"0")}] ${s.text}`));
      else console.log(r.text.slice(0, 280) + "…");
    }
  } catch (e) { console.error(`provenant: ${e.message}`); process.exit(1); }
}
