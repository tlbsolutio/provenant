#!/usr/bin/env node
// Provenant — provenance (who/what/when). Free via noembed; richer with YOUTUBE_API_KEY.
// Usage: node scripts/provenance.mjs <youtube-url|id> [--json]
const id = (String(process.argv[2] || "").match(/[A-Za-z0-9_-]{11}/) || [])[0];

export async function getProvenance(videoId, { youtubeKey } = {}) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const out = { videoId, url, title: null, channel: null, channelUrl: null,
                thumbnail: null, publishedAt: null, viewCount: null, source: [], errors: [] };
  try {
    const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if (!r.ok) throw new Error(`noembed ${r.status}`);
    const d = await r.json();
    Object.assign(out, { title: d.title, channel: d.author_name, channelUrl: d.author_url, thumbnail: d.thumbnail_url });
    out.source.push("noembed");
  } catch (e) { out.errors.push(`noembed: ${e.message}`); }
  if (youtubeKey) try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${youtubeKey}`);
    if (!r.ok) throw new Error(`youtube-api ${r.status}`);
    const v = (await r.json()).items?.[0];
    if (v) { Object.assign(out, { title: v.snippet?.title, channel: v.snippet?.channelTitle,
      publishedAt: v.snippet?.publishedAt, viewCount: v.statistics?.viewCount }); out.source.push("youtube-data-api"); }
  } catch (e) { out.errors.push(`youtube-api: ${e.message}`); }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!id) { console.log("Usage: provenance.mjs <url|id> [--json]"); process.exit(1); }
  const p = await getProvenance(id, { youtubeKey: process.env.YOUTUBE_API_KEY || undefined });
  if (process.argv.includes("--json")) console.log(JSON.stringify(p, null, 2));
  else console.log(`\n  ${p.title || "?"}\n  ${p.channel || "?"}  ${p.channelUrl || ""}\n  Published: ${p.publishedAt || "(needs YOUTUBE_API_KEY)"}\n  ${p.url}\n  via ${p.source.join(", ") || "—"}\n`);
}
