---
name: provenant
description: Use when given a video link (YouTube etc.) and asked to verify the source, fact-check it, transcribe it, summarize it, or check it for bias — for journalists, researchers, historians, or educators who need to vet a source fast.
---

# Provenant — verify a video source

Turn a video link into a **verifiable brief**: a timestamped transcript plus provenance, a fact-check, and a bias read. Works with **any AI** (you, the host agent, do the reasoning) and runs locally — no SaaS, no lock-in. Keys are optional; sources stay on the user's machine.

## When to use
- "Is this video legit / accurate?" · "Fact-check this clip." · "Summarize + check this source."
- A journalist / researcher / educator needs to vet or cite a video quickly.

## Setup (once, fast)
```bash
npm i                       # installs playwright (optional but recommended)
npx playwright install chromium
cp .env.example .env        # optional keys — skip for the free path
```

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
6. **Output** — a brief with each claim tied to its timestamp and sources. Optionally render `assets/report-template.html` (editorial layout) or hand back markdown.

## Honesty rules (non-negotiable for this audience)
- Always separate **verified-by-web** from **AI-inferred**; cite real sources; the human makes the call. You're a research assistant, not an oracle.
- No "deepfake true/false" verdict — at most, surface signals + suggest reverse-image search of the thumbnail.
- Never present an unverified claim as fact.

## Notes
- Headless-browser transcript needs a non-blocked IP (most local machines); datacenter IPs may be bot-walled → it falls back to kome.ai automatically.
- Fully BYOK: see `.env.example`. The free path (browser + kome + noembed) needs no keys.
