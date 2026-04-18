import { useState, useEffect, useRef } from 'react';
import { zip } from 'fflate';
import { SunIcon, MoonIcon, DownloadIcon, PlayIcon, PauseIcon } from '../components/Icons';
import { fetchProject, fetchSignedUrl } from '../utils/api';
import { parseProject, formatDuration, formatTotalDuration } from '../utils/parseProject';

const DISCS = [
  'disc-1.png', 'disc-2.png', 'disc-3.png', 'disc-4.png', 'disc-5.png',
  'disc-6.png', 'disc-7.png', 'disc-8.png', 'disc-9.png', 'disc-10.png',
];

const PROJECT_URL_RE = /library\/project\/([^/?#]+)/;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function extractId(input) {
  const m = input.match(PROJECT_URL_RE);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]+$/.test(input)) return input;
  return null;
}

function sanitize(name) { return name.replace(/[/\\:*?"<>|]/g, '_'); }

function Spinner({ size = 14 }) {
  return <span className="spinner" style={{ width: size, height: size }} />;
}

async function fetchWithProgress(url, signal, onProgress) {
  const res = await fetch(url, { signal });
  const total = parseInt(res.headers.get('content-length') || '0', 10);
  if (!total || !res.body) return res.blob();
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(received / total);
  }
  const arr = new Uint8Array(received);
  let pos = 0;
  for (const c of chunks) { arr.set(c, pos); pos += c.length; }
  return new Blob([arr]);
}

function TrackName({ name }) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const [dist, setDist] = useState(0);

  useEffect(() => {
    const w = wrapRef.current;
    const t = textRef.current;
    if (w && t) setDist(Math.max(0, t.scrollWidth - w.clientWidth));
  }, [name]);

  return (
    <span ref={wrapRef} className="home__track-name">
      <span
        ref={textRef}
        className={dist > 0 ? 'home__track-name--scroll' : ''}
        style={dist > 0 ? { '--sd': `${dist}px` } : {}}
      >
        {name}
      </span>
    </span>
  );
}

const GithubLink = () => (
  <a
    href="https://github.com/edideaur/untitled-dl"
    className="home__github"
    target="_blank"
    rel="noopener noreferrer"
  >
    ★ star me on GitHub
  </a>
);

export default function Home() {
  const [value, setValue]       = useState('');
  const [error, setError]       = useState('');
  const [discIdx, setDiscIdx]   = useState(() => Math.floor(Math.random() * DISCS.length));
  const disc = DISCS[discIdx];
  const [spin, setSpin]         = useState(false);
  const [theme, setTheme]       = useState(() => document.documentElement.dataset.theme || 'dark');
  const [project, setProject]   = useState(null);
  const [fetching, setFetching] = useState(false);
  const [dlProgress, setDlProgress]       = useState(null); // null | { done, total }
  const [dlTracks, setDlTracks]           = useState(new Set());
  const [trackProgress, setTrackProgress] = useState({}); // trackId -> 0..1

  // Audio player
  const audioRef = useRef(new Audio());
  const [playingId, setPlayingId]     = useState(null);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [audioLoading, setAudioLoading] = useState(null);

  // Abort controllers
  const trackAborts = useRef({});
  const zipAbort    = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); setPlayingId(null); };
    audio.addEventListener('play',  onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('play',  onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    setSpin(true);
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = `/assets/discs/${pick(DISCS)}`;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  async function loadProject(id) {
    setError('');
    setFetching(true);
    setProject(null);
    audioRef.current.pause();
    setPlayingId(null);
    try {
      const data = await fetchProject(id);
      const parsed = parseProject(data);
      if (!parsed) throw new Error('Could not parse project data.');
      setProject(parsed);
    } catch (err) {
      setError(err.message || 'Failed to load project.');
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    const slug = window.location.pathname.match(/^\/project\/([^/]+)/)?.[1];
    if (slug) { setValue(slug); loadProject(slug); }
  }, []);

  useEffect(() => {
    function onPop() {
      const slug = window.location.pathname.match(/^\/project\/([^/]+)/)?.[1];
      if (slug) loadProject(slug);
      else { setProject(null); setError(''); }
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    setTheme(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    const id = extractId(trimmed);
    if (!id) { setError('Paste a valid untitled.stream project link or project ID.'); return; }
    window.history.pushState(null, '', `/project/${id}`);
    await loadProject(id);
  }

  async function handlePlay(track) {
    const audio = audioRef.current;
    if (playingId === track.id) {
      isPlaying ? audio.pause() : audio.play().catch(console.error);
      return;
    }
    audio.pause();
    setAudioLoading(track.id);
    try {
      const url = await fetchSignedUrl(track.audioPath);
      if (!url) return;
      audio.src = url;
      await audio.play();
      setPlayingId(track.id);
    } catch (err) {
      console.error('play error:', err);
    } finally {
      setAudioLoading(null);
    }
  }

  async function handleDownloadTrack(track) {
    // Cancel if already downloading
    if (dlTracks.has(track.id)) {
      trackAborts.current[track.id]?.abort();
      return;
    }
    const ctrl = new AbortController();
    trackAborts.current[track.id] = ctrl;
    setDlTracks(s => new Set(s).add(track.id));
    setTrackProgress(p => ({ ...p, [track.id]: 0 }));
    try {
      const url = await fetchSignedUrl(track.audioPath);
      if (!url) return;
      const blob = await fetchWithProgress(url, ctrl.signal, pct => {
        setTrackProgress(p => ({ ...p, [track.id]: pct }));
      });
      const objUrl = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: objUrl, download: `${sanitize(track.name)}.mp3` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    } finally {
      delete trackAborts.current[track.id];
      setDlTracks(s => { const n = new Set(s); n.delete(track.id); return n; });
      setTrackProgress(p => { const n = { ...p }; delete n[track.id]; return n; });
    }
  }

  async function handleDownloadZip() {
    // Cancel if already running
    if (dlProgress !== null) {
      zipAbort.current?.abort();
      return;
    }
    const ctrl = new AbortController();
    zipAbort.current = ctrl;
    const tracks = project.tracks;
    setDlProgress({ done: 0, total: tracks.length });
    const files = {};
    for (let i = 0; i < tracks.length; i++) {
      if (ctrl.signal.aborted) break;
      try {
        const url = await fetchSignedUrl(tracks[i].audioPath);
        if (url) {
          const buf = await fetchWithProgress(url, ctrl.signal, () => {});
          const arr = await buf.arrayBuffer();
          files[`${String(i + 1).padStart(2, '0')} - ${sanitize(tracks[i].name)}.mp3`] =
            [new Uint8Array(arr), { level: 0 }];
        }
      } catch (err) {
        if (err.name === 'AbortError') break;
      }
      setDlProgress({ done: i + 1, total: tracks.length });
    }
    if (!ctrl.signal.aborted) {
      await new Promise((resolve, reject) => {
        zip(files, (err, data) => {
          if (err) { reject(err); return; }
          const url = URL.createObjectURL(new Blob([data], { type: 'application/zip' }));
          const a = Object.assign(document.createElement('a'), { href: url, download: `${sanitize(project.name)}.zip` });
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        });
      });
    }
    zipAbort.current = null;
    setDlProgress(null);
  }

  const meta = project ? [
    project.owner,
    project.trackCount === 1 ? '1 track' : `${project.trackCount} tracks`,
    project.totalDuration ? formatTotalDuration(project.totalDuration) : null,
  ].filter(Boolean).join(' · ') : '';

  return (
    <div className={`home${project ? ' home--expanded' : ''}`}>
      <button className="home__theme" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
      </button>

      <div
        className={`home__disc ${spin ? 'home__disc--spin' : ''}`}
        onClick={() => setDiscIdx(i => (i + 1) % DISCS.length)}
        style={{ cursor: 'pointer' }}
      >
        <img src={`/assets/discs/${disc}`} alt="" />
      </div>

      <span className="home__logo">[untitled-dl]</span>

      <div className="home__body">
        <span className="home__label">paste a project link to download</span>

        <form className="home__form" onSubmit={handleSubmit}>
          <input
            className="home__input"
            type="text"
            placeholder="https://untitled.stream/library/project/..."
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
          <button className="home__submit" type="submit" disabled={!value.trim() || fetching}>
            {fetching ? 'loading…' : 'open project'}
          </button>
        </form>

        {error && <p className="home__error">{error}</p>}
        {!project && <GithubLink />}
      </div>

      {project && (
        <div className="home__project">
          <div className="home__project-header">
            {project.coverArt
              ? <img className="home__project-art" src={project.coverArt} alt={project.name} />
              : <div className="home__project-art home__project-art--empty" />}
            <div className="home__project-info">
              <span className="home__project-name">{project.name}</span>
              <span className="home__project-meta">{meta}</span>
            </div>
          </div>

          <div className="home__zip-wrap">
            <button
              className="home__project-zip"
              onClick={handleDownloadZip}
            >
              {dlProgress ? <Spinner size={15} /> : <DownloadIcon size={15} />}
              {dlProgress
                ? `zipping ${dlProgress.done} / ${dlProgress.total}…`
                : 'download all as zip'}
            </button>
            {dlProgress && (
              <div className="home__dl-bar">
                <div
                  className="home__dl-bar-fill"
                  style={{ width: `${(dlProgress.done / dlProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className="home__track-list">
            {project.tracks.map((track, i) => (
              <div
                key={track.id}
                className="home__track"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <button
                  className={`home__track-play${playingId === track.id ? ' is-active' : ''}`}
                  onClick={() => handlePlay(track)}
                  aria-label={playingId === track.id && isPlaying ? 'Pause' : 'Play'}
                >
                  {audioLoading === track.id
                    ? <Spinner size={11} />
                    : playingId === track.id
                      ? (isPlaying ? <PauseIcon size={11} /> : <PlayIcon size={11} />)
                      : (
                        <>
                          <span className="home__track-num-text">{i + 1}</span>
                          <span className="home__track-play-icon"><PlayIcon size={11} /></span>
                        </>
                      )
                  }
                </button>
                <TrackName name={track.name} />
                <span className="home__track-dur">{formatDuration(track.duration)}</span>
                <button
                  className="home__track-dl"
                  onClick={() => handleDownloadTrack(track)}
                  aria-label={dlTracks.has(track.id) ? 'Cancel download' : `Download ${track.name}`}
                >
                  {dlTracks.has(track.id) ? <Spinner size={13} /> : <DownloadIcon size={13} />}
                </button>
                {dlTracks.has(track.id) && (
                  <div className="home__track-progress">
                    <div
                      className={`home__track-progress-fill${!trackProgress[track.id] ? ' home__track-progress-fill--indeterminate' : ''}`}
                      style={trackProgress[track.id] ? { width: `${trackProgress[track.id] * 100}%` } : {}}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <GithubLink />
        </div>
      )}
    </div>
  );
}
