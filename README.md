# Provenant 🎥🔎

**Know where it came from.** A dead-simple, open-source skill to verify a video source — transcript + provenance + fact-check + bias — that works with **any AI**.

**No login. No keys. No install** (just Node 18+). For journalists, researchers and educators who need to vet a source fast.

## Use it in one line

**With your AI agent** (Claude Code, Cursor, Codex, Gemini…) — paste this once:
```
Install the skill at https://github.com/tlbsolutio/provenant and use it to verify this video: <PASTE VIDEO LINK>
```
The agent clones it and follows `SKILL.md` — transcript, fact-check, bias, the lot.

**Or by hand** (no install, no keys):
```bash
git clone https://github.com/tlbsolutio/provenant
node provenant/scripts/get_transcript.mjs "<video link>"        # transcript
node provenant/scripts/provenance.mjs   "<video link>"          # who/when/channel
```

**Full verification report** (HTML — summary, fact-check, bias + transcript):
```bash
node provenant/scripts/report.mjs "<video link>" --analyze -o report.html
```
Analysis runs through **local Claude Code** by default (your subscription, no API key) — or `--ai anthropic` / `--ai openai` with your key. Open `report.html` in a browser.

## Want more? (all optional)
- **Timestamps, no key** — `npm i && npx playwright install chromium`, then it scrapes the real transcript panel with timecodes. Auto-used when present.
- **Timestamps on any server** — set `SUPADATA_API_KEY` (free tier at supadata.ai).
- **Richer fact-check / metadata** — `TAVILY_API_KEY`, `GOOGLE_FACTCHECK_API_KEY`, `YOUTUBE_API_KEY`. See `.env.example`. Keys stay in your local `.env`, never sent anywhere.

## What you get
1. **Transcript** (timestamped when possible) — cite "at 12:34…".
2. **Provenance** — channel, upload date, thumbnail.
3. **Fact-check** — concrete claims → verdict + sources, *verified-by-web vs AI-inferred* kept separate.
4. **Bias** — political lean + confidence, plus non-political (commercial) slants.

## Why it's different
- 🤖 **Any AI** — it's an [Agent Skill](https://agentskills.io); your model does the analysis, so it's not tied to one provider.
- 🔓 **Open & private** — public repo, your sources and keys never leave your machine.
- 🧭 **Honest** — a research assistant, not an oracle. Cites sources, flags uncertainty, no deepfake "true/false" call. Verify before you publish. MIT.
