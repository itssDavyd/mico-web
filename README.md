# 🎙️ MICO - Meeting Intelligence & Content Organizer

![SvelteKit](https://img.shields.io/badge/SvelteKit-blue?style=for-the-badge&logo=svelte&logoColor=white) ![Svelte](https://img.shields.io/badge/Svelte-4A4A55?style=for-the-badge&logo=svelte&logoColor=FF3E00) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) ![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

MICO is an intelligent web recording application that uses artificial intelligence to automatically transcribe audio recordings into PDF format. The application lets you manage recordings, view them in a list, and download or delete them as needed.

## Features

- 🎙️ Audio recording directly from the browser
- 🤖 Automatic AI-powered transcription
- 📄 PDF generation with transcriptions
- 📋 Recording listing and management
- ⬇️ Download transcriptions in PDF format
- 🗑️ Recording deletion

## Technology Stack

- **Framework**: SvelteKit (Svelte 5) — fully prerendered static SPA + PWA
- **Styling**: TailwindCSS v4 + Skeleton UI
- **Package manager**: pnpm
- **Deployment**: Docker (nginx)

## Installation

Install the project dependencies:

```sh
pnpm install
```

## Development

Start the development server:

```sh
pnpm dev

# or open the app automatically in the browser
pnpm dev -- --open
```

## Build

MICO is a **frontend-only** app. It is fully prerendered to static files
(`@sveltejs/adapter-static`) and talks to a separate backend directly from the
browser. To create a production build:

```sh
pnpm build
```

The static output is written to `build/`. You can preview it with `pnpm preview`.

> ⚠️ `VITE_BACKEND_URL` is **inlined at build time** by Vite. Set it before
> building (via `.env` or the shell environment) — changing it afterwards has no
> effect on an already-built bundle.

## Configuration

| Variable            | Description                                  | Default                 |
| ------------------- | -------------------------------------------- | ----------------------- |
| `VITE_BACKEND_URL`  | URL of the backend (transcription/PDF API).  | `http://localhost:8000` |

Copy `.env.example` to `.env` for local development:

```sh
cp .env.example .env
```

## Deployment (Docker on a VPS)

The app ships as a static site served by **nginx** in a small multi-stage image.

### 1. Build the image

Pass `VITE_BACKEND_URL` as a build arg (inlined at build time):

```sh
# With docker compose (reads VITE_BACKEND_URL from the shell/.env):
VITE_BACKEND_URL=https://api.your-domain.com docker compose build

# Or with plain docker:
docker build \
  --build-arg VITE_BACKEND_URL=https://api.your-domain.com \
  -t mico-web:latest .
```

### 2. Run it

```sh
# docker compose (recommended):
VITE_BACKEND_URL=https://api.your-domain.com docker compose up -d

# Or plain docker:
docker run -d --name mico-web -p 8080:80 mico-web:latest
```

The container listens on port **80** internally. `docker-compose.yml` maps it to
host port **8080** by default — override with the `MICO_WEB_PORT` env var. Put a
reverse proxy (nginx/Traefik/Caddy) with TLS in front of it for production.

### Notes & caveats

- **HTTPS is required** for microphone access in the browser (except on
  `localhost`). Serve the app over TLS in production.
- **Cookies / CORS**: auth uses cookies with `credentials: "include"`. If the
  frontend and backend are on different origins, the backend must send
  `Access-Control-Allow-Origin: <frontend origin>`,
  `Access-Control-Allow-Credentials: true`, and set cookies with
  `SameSite=None; Secure` (which also requires HTTPS).
- To change the backend URL you must **rebuild** the image.

### Installing as a PWA ("Add to Home Screen")

MICO is an installable PWA when served over **HTTPS**. Browsers will offer
"Add to Home Screen" / "Install app" using the bundled `manifest.json`, service
worker (`sw.js`), and app icons.

---

<p align="center">
  <strong>MICO</strong> - Meeting Intelligence & Content Organizer<br>
  Developer: David Fernandez <br>
  Company: Aitodetec
</p>
