export async function onRequestGet(context) {
  const { request } = context;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return jsonResponse({ error: "Missing id parameter" }, 400);
  }

  try {
    const res = await fetch(`https://untitled.stream/library/project/${id}?_data`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return jsonResponse({ error: "Failed to fetch upstream" }, 502);
  }
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
