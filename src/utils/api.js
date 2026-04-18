const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export async function fetchProject(id) {
  const res = await fetch(`${API_BASE}/api/project?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchSignedUrl(objectPath) {
  if (!objectPath) return null;
  const res = await fetch(`${API_BASE}/api/signedUrl?object=${encodeURIComponent(objectPath)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.signedURL ?? data.signedUrl ?? data.url ?? null;
}
