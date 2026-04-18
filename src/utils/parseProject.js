function extractObjectPath(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/\/object\/(.+?)(?:\?|$)/);
  return m ? m[1] : null;
}

function preferredAudioPath(raw) {
  const candidates = [raw.audio_url, raw.audio_fallback_url, raw.file_url]
    .map(extractObjectPath).filter(Boolean);
  return candidates.find(p => p.startsWith('private-audio/')) ?? candidates[0] ?? null;
}

function normalizeTrack(raw, index) {
  return {
    id: raw.id ?? `track-${index}`,
    index,
    name: raw.title ?? raw.name ?? `Track ${index + 1}`,
    duration: raw.duration ?? 0,
    audioPath: preferredAudioPath(raw),
  };
}

function findEntry(data) {
  if (data?.project) return data;
  const loaderData = data?.state?.loaderData ?? {};
  for (const val of Object.values(loaderData)) {
    if (val?.project) return val;
  }
  return null;
}

export function parseProject(remixContext) {
  const entry = findEntry(remixContext);
  if (!entry) return null;

  const p = entry.project;
  if (!p) return null;

  const rawTracks = entry.tracks ?? p.tracks ?? [];

  return {
    id: p.id ?? p.base_id,
    name: p.title ?? p.name ?? 'Untitled Project',
    owner: p.artist_name ?? p.username ?? p.owner?.username ?? p.owner?.name ?? '',
    coverArt: p.artwork_signed_url ?? p.artwork_url ?? p.cover_art_url ?? null,
    tracks: rawTracks.map(normalizeTrack),
    trackCount: rawTracks.length,
    totalDuration: rawTracks.reduce((s, t) => s + (t.duration ?? 0), 0),
  };
}

export function formatDuration(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const s = Math.floor(secs);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function formatTotalDuration(secs) {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}
