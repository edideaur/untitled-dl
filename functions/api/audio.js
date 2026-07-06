export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('src');
  if (!targetUrl) return new Response('Missing src', { status: 400 });

  const headers = {};
  const range = request.headers.get('Range');
  if (range) headers.Range = range;

  const response = await fetch(targetUrl, { headers });

  const resHeaders = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
  });

  const contentLength = response.headers.get('Content-Length');
  if (contentLength) resHeaders.set('Content-Length', contentLength);

  const contentRange = response.headers.get('Content-Range');
  if (contentRange) resHeaders.set('Content-Range', contentRange);

  return new Response(response.body, {
    status: response.status,
    headers: resHeaders,
  });
}
