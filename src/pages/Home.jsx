import { useState, useEffect } from 'react';
import { zip } from 'fflate';
import { SunIcon, MoonIcon, DownloadIcon } from '../components/Icons';
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

export default function Home() {
  const [value, setValue]       = useState('');
  const [error, setError]       = useState('');
  const [disc]                  = useState(() => pick(DISCS));
  const [spin, setSpin]         = useState(false);
  const [theme, setTheme]       = useState(() => document.documentElement.dataset.theme || 'dark');
  const [project, setProject]   = useState(null);
  const [fetching, setFetching] = useState(false);
  const [dlProgress, setDlProgress] = useState(null);

  useEffect(() => {
    setSpin(true);
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = `/assets/discs/${pick(DISCS)}`;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    setTheme(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const trimmed = value.trim();
    if (!trimmed) return;
    const id = extractId(trimmed);
    if (!id) { setError('Paste a valid untitled.stream project link or project ID.'); return; }

    setFetching(true);
    setProject(null);
    try {
      const data = await fetchProject(id);
      const parsed = parseProject(data);
      if (!parsed) throw new Error('Could not parse project data.');
      setProject(parsed);
      window.history.pushState(null, '', `/project/${id}`);
    } catch (err) {
      setError(err.message || 'Failed to load project.');
    } finally {
      setFetching(false);
    }
  }

  async function handleDownloadZip() {
    if (!project?.tracks?.length || dlProgress !== null) return;
    const tracks = project.tracks;
    setDlProgress({ done: 0, total: tracks.length });
    const files = {};
    for (let i = 0; i < tracks.length; i++) {
      try {
        const url = await fetchSignedUrl(tracks[i].audioPath);
        if (url) {
          const buf = await fetch(url).then(r => r.arrayBuffer());
          files[`${String(i + 1).padStart(2, '0')} - ${sanitize(tracks[i].name)}.mp3`] =
            [new Uint8Array(buf), { level: 0 }];
        }
      } catch {}
      setDlProgress({ done: i + 1, total: tracks.length });
    }
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
    setDlProgress(null);
  }

  async function handleDownloadTrack(track) {
    const url = await fetchSignedUrl(track.audioPath);
    if (!url) return;
    const blob = await fetch(url).then(r => r.blob());
    const objUrl = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: objUrl, download: `${sanitize(track.name)}.mp3` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(objUrl);
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

      <div className={`home__disc ${spin ? 'home__disc--spin' : ''}`}>
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

          <button
            className="home__project-zip"
            onClick={handleDownloadZip}
            disabled={dlProgress !== null}
          >
            <DownloadIcon size={15} />
            {dlProgress
              ? `zipping ${dlProgress.done} / ${dlProgress.total}…`
              : 'download all as zip'}
          </button>

          <div className="home__track-list">
            {project.tracks.map((track, i) => (
              <div key={track.id} className="home__track">
                <span className="home__track-num">{i + 1}</span>
                <span className="home__track-name">{track.name}</span>
                <span className="home__track-dur">{formatDuration(track.duration)}</span>
                <button
                  className="home__track-dl"
                  onClick={() => handleDownloadTrack(track)}
                  aria-label={`Download ${track.name}`}
                >
                  <DownloadIcon size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
