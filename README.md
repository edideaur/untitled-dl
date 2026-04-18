# [untitled-dl]

Download music projects from [untitled.stream](https://untitled.stream) as individual MP3s or a ZIP archive, directly in your browser.

## Usage

1. Copy a project link from untitled.stream (e.g. `https://untitled.stream/library/project/...`)
2. Paste it into [untitled-dl](https://untitled-dl.pages.dev) and press **open project**
3. Preview tracks, download individual songs, or grab everything as a ZIP

## API

The app exposes a small proxy API. See `/api` for the full schema.

| Endpoint | Description |
|---|---|
| `GET /api/project?id=<id>` | Fetch project metadata and track list |
| `GET /api/signedUrl?object=<bucket/path>` | Get a signed URL for a private audio file |

## Development

```sh
bun install
bun run dev
```

Requires [Bun](https://bun.sh). Built with Vite + React, deployed on Cloudflare Pages.

## License

[GNU General Public License v3.0](LICENSE)
