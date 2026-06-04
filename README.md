<div align="center">

# Provenant 🎥🔎

**Know where it came from.**

A dead-simple, open-source skill to **verify a video source** — timestamped transcript, provenance, fact-check and bias — that works with **any AI**.

**No login · No keys · No install** (just Node 18+).

[![License: MIT](https://img.shields.io/badge/License-MIT-2f5fff.svg)](#license) · For journalists, researchers & educators.

</div>

---

## Why Provenant

Plenty of tools *summarize* a video. Almost none help you **verify** one — check who/when it came from, archive it before it disappears, and separate facts from claims, with the receipts. Provenant does that, runs locally, and never touches your sources or your AI bill.

- 🤖 **Any AI** — it's an [Agent Skill](https://agentskills.io); *your* model (Claude, GPT, Gemini…) does the reasoning, or run it through local Claude Code for free.
- 🔓 **Open & private** — public repo, your sources and API keys never leave your machine.
- 🧭 **Honest by design** — a research assistant, not an oracle: it cites sources, separates *verified-by-web* from *AI-inferred*, and refuses to render a "deepfake true/false" verdict.

## What you get

| Pillar | What it does |
|---|---|
| **Transcript** | Timestamped when possible ("at 12:34…"), plain text otherwise |
| **Provenance** | Channel, upload date, thumbnail (for reverse-image search) |
| **Fact-check** | Concrete claims → verdict + sources, *web-verified vs AI-inferred* kept apart |
| **Bias** | Political lean (−5…+5 / none) + confidence, plus non-political (commercial) slants |

## Quick start

**With your AI agent** — paste once:
```
Install the skill at https://github.com/tlbsolutio/provenant and use it to verify this video: <PASTE LINK>
```

**By hand** (no install, no keys):
```bash
git clone https://github.com/tlbsolutio/provenant
node provenant/scripts/get_transcript.mjs "<video link>"     # transcript
node provenant/scripts/provenance.mjs   "<video link>"       # who / when / channel
```

**Full verification report** (HTML — summary, fact-check, bias + transcript):
```bash
node provenant/scripts/report.mjs "<video link>" --analyze -o report.html
```
Analysis runs through **local Claude Code** by default (your subscription, no API key) — or `--ai anthropic` / `--ai openai` with your own key.

## How it works

```
URL ──► get_transcript ──► provenance ──► analyze ──► report.html
         │ Supadata (key, timestamped)     │ noembed     │ claude-cli (local, default)
         │ headless browser (timestamped)  │ YouTube API │ anthropic / openai (your key)
         └ kome.ai (no key, plain text)                  └ + Tavily web fact-check (optional)
```
First working method wins. Everything beyond the free core is opt-in.

## Configuration (all optional — see `.env.example`)

| Key | Unlocks |
|---|---|
| `SUPADATA_API_KEY` | Timestamped transcript on any IP |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | AI analysis via API (instead of local Claude) |
| `TAVILY_API_KEY` | Real web sources attached to fact-checks |
| `GOOGLE_FACTCHECK_API_KEY` | ClaimReview matches |
| `YOUTUBE_API_KEY` | Upload date & channel stats |

Keys are read from your local `.env` (git-ignored) and sent **only** to their own provider.

## Security & privacy

- **BYOK, local-only** — no server, no telemetry, no account. Keys and transcripts stay on your machine.
- **No secrets in the repo** — `.env` is git-ignored; only `.env.example` (empty) is tracked.
- **Hardened rendering** — all HTML output is escaped; AI-supplied links are scheme-checked (`http(s)` only) to prevent `javascript:`/`data:` injection.
- **No SSRF** — fetched endpoints are fixed; the video id is regex-validated (`[A-Za-z0-9_-]{11}`).
- **No shell injection** — the local-AI bridge uses `spawn` with argument arrays, never a shell string.
- ⚠️ **Prompt-injection caveat** — a transcript is untrusted text fed to an LLM; a video could try to steer the analysis. Treat AI output as a draft and verify the cited sources.

## Limitations (read before you publish)

- Verdicts are **best-effort research aids, not editorial fact-checking**. Always check the cited sources yourself.
- **No manipulation/deepfake verdict** — at most, reverse-image-search the thumbnail.
- Bias scoring is inherently subjective; it's evidence-based but not authoritative.
- The headless-browser transcript needs a non-blocked IP (most local machines); datacenter IPs may be rate-limited and fall back to the keyless API path.

## Compatibility

Works as an [Agent Skill](https://agentskills.io) in Claude Code, Cursor, Codex, OpenCode, Gemini CLI and others, **or** as a plain Node CLI. Requires Node ≥ 18.

## Contributing

Issues and PRs welcome. The transcript layer is provider-agnostic — to add a source, drop a function into `scripts/get_transcript.mjs` following the existing `via*` pattern; the rest of the pipeline is source-agnostic.

## License

Released under the **MIT License** — see [`LICENSE`](LICENSE).

**In plain terms:** you may use, copy, modify, merge, publish, distribute, sublicense and sell this software, including commercially, **provided** the copyright notice and the MIT permission notice are kept in all copies. It is provided **"as is", without warranty of any kind**; the authors are not liable for any claim or damages arising from its use.

### Legal & disclaimers
- **Not legal/editorial advice.** Provenant is a research aid. You are responsible for verifying any claim before publishing or relying on it.
- **Third-party services.** Optional integrations (Supadata, kome.ai, Tavily, Google, YouTube, Anthropic, OpenAI, archive.org) are governed by **their own terms and pricing**. Using them is your responsibility; respect each provider's Terms of Service, including YouTube's.
- **No affiliation.** Provenant is an independent project and is **not affiliated with, endorsed by, or sponsored by** YouTube, Google, Anthropic, OpenAI or any other provider. All trademarks belong to their respective owners.
- **Your data stays yours.** Provenant stores nothing remotely and ships no telemetry.

© 2026 Solutio. MIT.
