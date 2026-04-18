const BOT_RE =
  /discordbot|twitterbot|facebookexternalhit|bingbot|googlebot|slurp|whatsapp|pinterest|slackbot|telegrambot|linkedinbot|mastodon|signal|snapchat|redditbot|skypeuripreview|viberbot|linebot|embedly|quora|outbrain|tumblr|duckduckbot|yandexbot|rogerbot|showyoubot|kakaotalk|naverbot|seznambot|mediapartners|adsbot|petalbot|applebot|ia_archiver/i;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function onRequest(context) {
  const { request, env, params } = context;
  const ua = request.headers.get('User-Agent') || '';

  if (!BOT_RE.test(ua)) {
    const url = new URL(request.url);
    url.pathname = '/';
    return env.ASSETS.fetch(new Request(url.toString(), request));
  }

  const id = params.id;
  const pageUrl = request.url;

  let title = '[untitled-dl]';
  let description = 'Download music projects from untitled.stream';
  let image = null;
  let siteName = 'untitled-dl';

  try {
    const res = await fetch(`https://untitled.stream/library/project/${encodeURIComponent(id)}?_data`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const p = data?.project ?? data;
      if (p) {
        const name   = p.title ?? p.name;
        const artist = p.artist_name ?? p.username;
        const tracks = (data?.tracks ?? p.tracks ?? []).length;
        const art    = p.artwork_signed_url ?? p.artwork_url ?? p.cover_art_url ?? null;

        if (name)   title = `${name}${artist ? ` · ${artist}` : ''} — untitled-dl`;
        if (artist) siteName = artist;
        description = [
          artist ? `by ${artist}` : null,
          tracks ? `${tracks} track${tracks !== 1 ? 's' : ''}` : null,
          'Download on untitled-dl',
        ].filter(Boolean).join(' · ');
        if (art) image = art;
      }
    }
  } catch {
    // fall through to defaults
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#191919">

  <meta property="og:site_name" content="${esc(siteName)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="music.album">
  <meta property="og:url" content="${esc(pageUrl)}">
  ${image ? `<meta property="og:image" content="${esc(image)}">` : ''}

  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  ${image ? `<meta name="twitter:image" content="${esc(image)}">` : ''}
</head>
<body>
  <h1>${esc(title)}</h1>
  <p>${esc(description)}</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
