---
name: provenant
description: Use when given a video link (YouTube etc.) and asked to verify the source, fact-check it, transcribe it, summarize it, or check it for bias — for journalists, researchers, historians, or educators who need to vet a source fast.
---

# Provenant — verify a video source

Turn a video link into a **verifiable brief**: a timestamped transcript plus provenance, a fact-check, and a bias read. Works with **any AI** (you, the host agent, do the reasoning) and runs locally — no SaaS, no lock-in. Keys are optional; sources stay on the user's machine.

## When to use
- "Is this video legit / accurate?" · "Fact-check this clip." · "Summarize + check this source."
- A journalist / researcher / educator needs to vet or cite a video quickly.

## Setup
**None required** — the free path needs only Node 18+ (no install, no key, no login).
Optional, for timestamped transcripts: `npm i && npx playwright install chromium`.
Optional keys (Supadata/Tavily/YouTube): `cp .env.example .env`.

## Workflow
1. **Transcript** — run the bundled fetcher (AI-agnostic, key-optional):
   ```bash
   node scripts/get_transcript.mjs "<url>" --json
   ```
   It tries, in order: Supadata (if `SUPADATA_API_KEY`, timestamped) → **headless browser** (timestamped, no key) → kome.ai (plain text). Read the JSON; don't re-fetch.
2. **Provenance** — `node scripts/provenance.mjs "<url>"` → title, channel, upload date (with `YOUTUBE_API_KEY`), thumbnail. Note if it looks like a clip/re-upload.
3. **Analyze** (you do this with whatever model is running): write a one-line TL;DR + short neutral summary, 6–10 key points, and the tools/links named (real official URLs only — never invent the description's links).
4. **Fact-check** — pull only CONCRETE checkable claims. For each, verify with whatever web/search tool you have (web search, Tavily, Google Fact Check API…) and record `verdict ∈ {True, Mostly True, Mixed, Misleading, False, Unverifiable}` + sources + the **timestamp** where it's said. No search tool? Mark claims `Unverifiable (AI-inferred)` — never bluff.
5. **Bias** — political lean (Left…Center…Right / None, score −5..+5, `null` if non-political) with evidence + confidence. Separately flag non-political slants (commercial/promotional, sponsorship).
6. **Output — always two things, every run:**
   - **(a) The brief, inline** — hand back the markdown brief in the conversation (TL;DR, summary, key points, fact-check table with verdicts + sources, bias). This is what the human reads first.
   - **(b) A published HTML page** — render the full report and publish it to an accessible HTTPS URL.
     **Preferred** (the page carries *your* web-verified analysis): write your analysis as JSON, then:
     ```bash
     node scripts/report.mjs "<url>" --analysis-file analysis.json --publish
     ```
     The JSON shape: `{ tldr, summary, keyPoints[], keyLinks[{url,label,note}], factChecks[{verdict,claim,explanation,sources[],webChecked}], bias{political,score,lean,label,confidence,evidence,other_bias}, provider }`. `webChecked:true` = verified via a web tool; omit/false = AI-inferred (rendered with a badge — keep the two honest).
     **Autonomous fallback** (no agent analysis): `node scripts/report.mjs "<url>" --analyze --publish` lets the bundled analyzer do it (default local Claude Code, or `--ai anthropic|openai`).
     `--publish` deploys the page (see **Publishing**) and prints `published → https://…`. Surface that URL alongside the inline brief.

## Publishing (VPS-aware)
The point of `--publish` is a link anyone can open — important on a **VPS/datacenter host**, where a localhost file is *not* web-reachable. Behaviour, in order:
1. Resolve the site dir from `--publish-dir`, else `PROVENANT_PUBLISH_DIR`. None set → it writes the file and tells you where; it never claims to have published.
2. Copies `<id>.html` into the dir + regenerates `index.html`.
3. If the dir is linked to Vercel (`.vercel/project.json`) **or** `PROVENANT_VERCEL=1`, and the `vercel` CLI is present → `vercel deploy --prod --yes` and print the stable `https://<project>.vercel.app/<id>.html`.
4. Submits the published URL to the **Wayback Machine** (skip with `PROVENANT_ARCHIVE=0`). archive.org blocks many datacenter IPs → on failure it prints a manual `web.archive.org/save/…` link instead of failing.
5. No Vercel CLI / no target → prints the local path so you can host it elsewhere.

Set `PROVENANT_PUBLISH=1` in `.env` to publish on **every** run without passing `--publish` (recommended once a target is wired).

**Host-agent checklist before publishing:** confirm a real web target exists. Check `command -v vercel` (CLI) **or** a Vercel MCP tool (e.g. `deploy_to_vercel`). On a bot-walled VPS the CLI/MCP route is the *only* way to a public link — don't hand back a `file://` path and call it published. If no target is configured, say so plainly and return just the inline brief.

## Honesty rules (non-negotiable for this audience)
- Always separate **verified-by-web** from **AI-inferred**; cite real sources; the human makes the call. You're a research assistant, not an oracle.
- No "deepfake true/false" verdict — at most, surface signals + suggest reverse-image search of the thumbnail.
- Never present an unverified claim as fact.
- A published page must reflect the *verified* state — if publishing fails, say it failed; never imply a page is live when it isn't.

## Notes
- Headless-browser transcript needs a non-blocked IP (most local machines); datacenter IPs may be bot-walled → it falls back to kome.ai automatically.
- Fully BYOK: see `.env.example`. The free path (browser + kome + noembed) needs no keys. Publishing is opt-in via `PROVENANT_PUBLISH_DIR` (+ a Vercel-linked dir for a public URL).
