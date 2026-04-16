const DEFAULT_HEADERS = Object.freeze({
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
});

const REMIX_CONTEXT_REGEX = /<script[^>]*>\s*window\.__remixContext\s*=\s*([\s\S]*?);\s*<\/script>/;

export async function onRequestGet(context) {
  const { request } = context;
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return jsonResponse({ error: "Missing id parameter" }, 400);
  }

  const targetUrl = `https://untitled.stream/library/project/${id}`;

  let html;
  try {
    const res = await fetch(targetUrl, { headers: DEFAULT_HEADERS });

    if (!res.ok) {
      return jsonResponse({ error: `Upstream returned ${res.status}` }, res.status);
    }

    html = await res.text();
  } catch {
    return jsonResponse({ error: "Failed to fetch upstream" }, 502);
  }

  const match = html.match(REMIX_CONTEXT_REGEX);

  if (!match) {
    return jsonResponse({ error: "Could not find __remixContext in page" }, 404);
  }

  let remixContext;
  try {
    remixContext = JSON.parse(match[1]);
  } catch {
    return jsonResponse({ error: "Failed to parse __remixContext JSON" }, 500);
  }

  return new Response(JSON.stringify(remixContext), {
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
