const ALLOWED_BUCKETS = ["private-transcoded-audio", "private-audio"];
const DEFAULT_HEADERS = Object.freeze({
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  Accept: "application/json",
});

export async function onRequestGet(context) {
  const { request } = context;
  const object = new URL(request.url).searchParams.get("object");

  if (!object) {
    return jsonResponse({ error: "Missing object parameter" }, 400);
  }

  const slashIndex = object.indexOf("/");
  const bucket = slashIndex === -1 ? object : object.slice(0, slashIndex);
  const objectPath = slashIndex === -1 ? "" : object.slice(slashIndex + 1);

  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return jsonResponse({ error: `Invalid bucket. Allowed: ${ALLOWED_BUCKETS.join(", ")}` }, 400);
  }

  const targetUrl = `https://untitled.stream/api/storage/buckets/${bucket}/objects/${encodeURIComponent(objectPath)}/signedUrl?durationInSeconds=10800&cacheBufferInSeconds=600`;

  let res;
  try {
    res = await fetch(targetUrl, { headers: DEFAULT_HEADERS });
  } catch {
    return jsonResponse({ error: "Failed to fetch upstream" }, 502);
  }

  const body = await res.text();
  const contentType = res.headers.get("Content-Type") || "application/json";

  return new Response(body, {
    status: res.status,
    headers: { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" },
  });
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
