# Provenant 🎥🔎

**Know where it came from.** An open-source, **AI-agnostic** skill to verify a video source: a **timestamped transcript** + provenance + fact-check + bias read — fast, local, bring-your-own-key.

For **journalists, researchers/historians and educators** who need to vet or cite a video without handing their sources (or their AI bill) to a third party.

## Why
- 🤖 **Works with any AI** — it's an [Agent Skill](https://agentskills.io). The bundled scripts just fetch data; *your* agent (Claude, Codex, Cursor, Gemini…) does the analysis.
- 🌐 **Headless-browser transcript** — opens the real page and scrapes the transcript panel **with timestamps, no API key**. Falls back to a free API where a browser can't reach.
- 🔑 **BYOK / no-key** — the free path needs zero keys; add your own keys for more (timestamps on any IP, richer metadata, fact-check APIs). Keys stay in your local `.env`.
- 🔒 **Open & secure** — public repo, nothing committed but code.

## Install (fast)

**As an Agent Skill** (Claude Code, Cursor, Codex, …):
```bash
npx skills add tlbsolutio/provenant      # or: git clone into your skills dir
```
**Or standalone:**
```bash
git clone https://github.com/tlbsolutio/provenant && cd provenant
npm install
npx playwright install chromium          # for headless transcripts (recommended)
cp .env.example .env                      # optional — keys are all opt-in
```

## Use

Ask your AI: *"Verify this video: <url>"* — it follows `SKILL.md`. Or run the tools directly:

```bash
node scripts/get_transcript.mjs "<url>" --json      # timestamped transcript
node scripts/get_transcript.mjs "<url>" --no-browser # force the keyless API path
node scripts/provenance.mjs "<url>"                  # title · channel · date · thumbnail
```

Transcript attempts, in order: **Supadata** (key, timestamped) → **headless browser** (timestamped, no key) → **kome.ai** (plain text). First that works wins.

## What you get
1. **Timestamped transcript** — cite "at 12:34…".
2. **Provenance** — channel, upload date, thumbnail (for reverse-image search).
3. **Fact-check** — concrete claims → verdict + sources + timestamp, *verified-by-web vs AI-inferred* kept separate.
4. **Bias** — political lean + confidence, plus non-political (commercial) slants.

## Keys (all optional — see `.env.example`)
`SUPADATA_API_KEY` (timestamps on any IP) · `YOUTUBE_API_KEY` (upload date/stats) · `TAVILY_API_KEY` / `GOOGLE_FACTCHECK_API_KEY` (web fact-check) · `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` (only if you want a non-agent script to call a model; otherwise your host AI does it).

## Honesty
Verdicts are best-effort research aids, **not** editorial fact-checking — verify before you publish. No deepfake "true/false" call. Not affiliated with YouTube/Google. MIT licensed.
