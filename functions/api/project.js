export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const targetUrl = `https://untitled.stream/library/project/${id}`;

  let html;
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream returned ${res.status}` }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }

    html = await res.text();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch upstream" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const match = html.match(
    /<script[^>]*>\s*window\.__remixContext\s*=\s*([\s\S]*?);\s*<\/script>/
  );

  if (!match) {
    return new Response(
      JSON.stringify({ error: "Could not find __remixContext in page" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  let remixContext;
  try {
    remixContext = JSON.parse(match[1]);
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to parse __remixContext JSON" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify(remixContext), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
