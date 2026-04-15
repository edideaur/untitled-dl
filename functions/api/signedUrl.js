const ALLOWED_BUCKETS = ["private-transcoded-audio", "private-audio"];

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const object = url.searchParams.get("object");

  if (!object) {
    return new Response(
      JSON.stringify({ error: "Missing object parameter" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const slashIndex = object.indexOf("/");
  const bucket = slashIndex !== -1 ? object.slice(0, slashIndex) : object;
  const objectPath = slashIndex !== -1 ? object.slice(slashIndex + 1) : "";

  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return new Response(
      JSON.stringify({ error: `Invalid bucket. Allowed: ${ALLOWED_BUCKETS.join(", ")}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encodedObject = encodeURIComponent(objectPath);
  const targetUrl = `https://untitled.stream/api/storage/buckets/${bucket}/objects/${encodedObject}/signedUrl?durationInSeconds=10800&cacheBufferInSeconds=600`;

  let res;
  try {
    res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch upstream" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await res.text();

  return new Response(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
