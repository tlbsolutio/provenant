---
description: Verify a video source — transcript, provenance, fact-check, bias (Provenant)
argument-hint: <youtube-url>
---

Verify this video with the **provenant** skill: **$ARGUMENTS**

Do it directly (you are the AI — don't spawn a nested model). Find the provenant skill's `scripts/` folder (where this skill is installed) and:

1. **Fetch** (no AI): run `node scripts/get_transcript.mjs "$ARGUMENTS" --json` and `node scripts/provenance.mjs "$ARGUMENTS" --json`. Read the JSON; don't re-fetch. If provenance has no `source`, say provenance is unverified.
2. **Summarize**: one-line TL;DR + short neutral summary + 5–8 key points + the tools/links actually named (real URLs only).
3. **Fact-check**: pull the concrete, checkable claims (skip opinions/marketing). Verify each with web search; record verdict (True / Mostly True / Mixed / Misleading / False / Unverifiable) + sources + the timestamp where it's said. No search tool or no result → `Unverifiable (AI-inferred)`. Never bluff.
4. **Bias**: political lean (Left…Center…Right / None, −5..+5, null if non-political) + confidence + evidence; separately flag commercial/promotional slants.
5. **Answer in chat**, concise. Keep web-verified separate from AI-inferred; cite sources; no deepfake "true/false" verdict; the human decides.

For a shareable HTML page instead: `node scripts/report.mjs "$ARGUMENTS" --analyze -o report.html`.
