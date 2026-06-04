# Provenant 🎥🔎

*Know where it came from.*

Provenant turns a video link into something you can actually check: a timestamped transcript, where it came from, a fact-check with sources, and a read on its bias. It runs on your own machine, works with whatever AI you already use, and — by default — needs no login, no API keys, and nothing to install beyond Node 18.

I built it because every "YouTube summarizer" out there happily tells you what a video *says*, but none of them help you work out whether you should *believe* it — who posted it, when, whether the claims hold up, and whether it's quietly pushing an angle. That's the job journalists, researchers and teachers actually have, so that's what this tool is for.

A word up front: **Provenant is an assistant, not an oracle.** It cites its sources, keeps "checked against the web" separate from "the AI's best guess," and refuses to slap a confident "real/fake" label on anything. Treat its output as a strong first pass, then verify before you publish.

## What it gives you

- **A transcript** — with timestamps when it can get them, so you can cite "at 12:34…".
- **Provenance** — channel, upload date, thumbnail. If it *can't* establish where the video came from, it says so loudly instead of pretending.
- **A fact-check** — it pulls out the concrete, checkable claims and labels each one, keeping web-verified claims visibly separate from AI-inferred ones.
- **A bias read** — political lean with a confidence level, plus a note on non-political slants (a video can be perfectly neutral politically and still be one long sales pitch).

## Getting started

The fastest way, if you already work with an AI agent (Claude Code, Cursor, Codex, Gemini…), is to just tell it:

> Install the skill at https://github.com/tlbsolutio/provenant and use it to verify this video: `<paste a link>`

It clones the repo, reads `SKILL.md`, and does the rest.

Prefer to run it yourself? Nothing to configure:

```bash
git clone https://github.com/tlbsolutio/provenant
node provenant/scripts/get_transcript.mjs "<video link>"   # the transcript
node provenant/scripts/provenance.mjs   "<video link>"     # who / when / which channel
```

And for the full thing — summary, fact-check, bias and transcript in one HTML page:

```bash
node provenant/scripts/report.mjs "<video link>" --analyze -o report.html
```

By default the analysis runs through your local Claude Code (your subscription, not a metered API). If you'd rather use a key, add `--ai anthropic` or `--ai openai`.

### Optional: a `/provenant` slash command

The repo ships a ready-made shortcut at [`commands/provenant.md`](commands/provenant.md). Drop it into your harness's commands folder (for Claude Code: `cp commands/provenant.md ~/.claude/commands/`) and then, in any chat, just type:

```
/provenant <video link>
```

and you get the whole verification — transcript, fact-check (with web search), and bias — answered right in the conversation.

## Publishing a shareable page (optional)

A local `report.html` is fine on your laptop — but useless on a **server or VPS**, where `localhost` isn't reachable from anywhere else. So `--publish` turns the report into a real link:

```bash
node provenant/scripts/report.mjs "<video link>" --analyze --publish
```

It writes the page into your site directory (`PROVENANT_PUBLISH_DIR`), rebuilds an index, and — if that directory is linked to [Vercel](https://vercel.com) (or you set `PROVENANT_VERCEL=1`) and the `vercel` CLI is installed — deploys it and prints the public `https://…` URL. No target configured? It says so and hands back the file path, rather than pretending it published.

Two switches worth knowing:

- `PROVENANT_PUBLISH=1` — publish on **every** run, so you never have to remember the flag.
- The published URL is also submitted to the **Wayback Machine** by default (set `PROVENANT_ARCHIVE=0` to skip). archive.org tends to block datacenter IPs, so if the snapshot can't be taken from your host, Provenant prints a manual `web.archive.org/save/…` link you can open from your browser.

If you drive Provenant through an agent, it can also deploy via a Vercel MCP server instead of the CLI — same outcome, a public link.

## How it actually works

There's no magic. Each step tries a few methods and takes the first that works:

```
link ──► transcript ──► provenance ──► analysis ──► report.html
          Supadata (key, timestamps)   noembed      local Claude (default)
          headless browser (timestamps) YouTube API  Anthropic / OpenAI (your key)
          kome.ai (no key, plain text)               + Tavily web check (optional)
```

The free path — headless browser or kome.ai, plus noembed — needs no keys at all. Everything else is opt-in.

## Adding keys (optional)

Copy `.env.example` to `.env` and fill in only what you want. Keys live in that local file (which is git-ignored) and are sent **only** to the service they belong to — never to me, because there is no "me": no server, no account, no telemetry.

| Key | What it adds |
|---|---|
| `SUPADATA_API_KEY` | Timestamps even on a server/blocked IP |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Run the analysis via API instead of local Claude |
| `TAVILY_API_KEY` | Real web sources attached to each fact-check |
| `GOOGLE_FACTCHECK_API_KEY` | Matches against published fact-checks |
| `YOUTUBE_API_KEY` | Upload date and channel stats |

## Where it's careful (and where it isn't)

Security I've tried to get right, because this thing handles untrusted input (the video, the AI's output) and may be driven by an agent:

- Output is HTML-escaped, and any link the AI suggests is checked to be `http(s)` before it lands in the page — no `javascript:` surprises.
- The only thing pulled from your input is an 11-character video id, so there's no way to point the fetches at somewhere they shouldn't go.
- The local-AI call uses a proper argument array, not a shell string, so a transcript can't smuggle in a command.
- When a check fails — provenance can't be found, the web search dies, the AI returns something half-baked — Provenant tells you, rather than rendering a confident-looking report built on nothing.

What it deliberately **won't** do: judge whether a video is a deepfake. That's a genuinely hard problem, and a wrong "it's fake" is worse than no answer — so at most it points you at a reverse-image search of the thumbnail. Bias scoring is honest but subjective. And remember the standing caveat: a video is untrusted text fed to a language model, so treat the analysis as a draft and check the sources it cites.

## Compatibility & contributing

It's a standard [Agent Skill](https://agentskills.io), so it works in Claude Code, Cursor, Codex, Gemini and friends — or as a plain Node CLI. Node 18+.

Want to add a transcript source? Drop a `via*` function into `scripts/get_transcript.mjs` following the existing pattern; the rest of the pipeline doesn't care where the text came from. Issues and PRs welcome.

## License

MIT — the full text is in [`LICENSE`](LICENSE).

In plain terms: do almost anything with it — use it, change it, fold it into something commercial — as long as you keep the copyright line and the MIT notice in your copies. It comes with **no warranty**: if it gets something wrong, that's on the situation, not on me legally.

A few things worth saying plainly:

- **It's a research aid, not a verdict.** You're responsible for checking any claim before you rely on it or publish it.
- **The optional services have their own rules.** Supadata, kome.ai, Tavily, Google, YouTube, Anthropic, OpenAI, archive.org — each has its own terms and pricing, and using them is your call and your responsibility, including YouTube's Terms of Service.
- **No affiliation.** Provenant is independent and isn't endorsed by or connected to YouTube, Google, Anthropic, OpenAI or anyone else. Trademarks belong to their owners.
- **Your data stays with you.** Nothing is stored remotely; nothing phones home.

© 2026 Solutio · MIT
