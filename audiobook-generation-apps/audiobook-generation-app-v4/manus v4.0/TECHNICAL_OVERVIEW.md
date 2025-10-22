# Audiobook Generator – Technical Overview

This document describes the structure of the modular Audiobook Generator application, the responsibilities of each module, and the interactions between runtime components.

## Runtime Topology

```
+------------+      +---------------+      +------------------+
|   app.js   | ---> |   server.js   | ---> |  htmlTemplate.js |
| (entry)    |      | (HTTP/SSE API)|      | (UI markup)      |
|            |      |               |      +------------------+
|            |      |               |      +------------------+
|            | ---> |   projectService.js  |
+------------+      |   (domain logic)     |
                    +----------------------+
```

1. `app.js` bootstraps the service and HTTP server, then announces the start banner and attempts to open a browser window.
2. `server.js` exposes REST endpoints, static audio streaming, and Server-Sent Events (SSE) endpoints. It delegates business rules to `projectService.js` and renders the front-end via `htmlTemplate.js`.
3. `projectService.js` owns core audiobook processing: project persistence, manuscript parsing, ElevenLabs API usage, ffmpeg orchestration, and status updates.
4. `htmlTemplate.js` returns a static HTML+CSS+JS string that delivers the browser UI. It is rendered on `/` and contains all client-side logic.

## Module Responsibilities

### `app.js`
- Imports the service (`createProjectService`), server factory (`createServer`), and UI template (`getHTML`).
- Determines the runtime port (`PORT` env with fallback to 3000).
- Creates a service instance, passes it to `createServer`, and waits for `listen` to resolve.
- Prints an ASCII banner and tries to open the browser using `open`/`start`/`xdg-open` based on platform.

### `server.js`
- Accepts an instantiated service and `getHTML` function.
- Maintains an in-memory map of SSE clients per project ID.
- Registers a service update handler so project events fan out to listening SSE response streams.
- Handles:
  - `GET /` and `/index.html` → renders the inlined HTML interface.
  - `GET /audio/...` → streams generated chapter or book MP3 files from the `output` directory.
  - Project CRUD endpoints (`/api/projects`, `/api/projects/:id`, `/api/projects/:id/start|pause|resume|book`).
  - `POST /api/voices` for lookups and API key validation.
  - `GET /api/events/:projectId` to keep clients updated on generation progress.
- Provides helper utilities (`readJson`, `sendJson`, `serveAudio`, `handleEventStream`) and a `listen` method returning a promise.

### `projectService.js`
- Configures data directories (`output`, `chunks`, `chapters`, `book`) and JSON persistence via `projects.json`.
- Loads persisted projects on startup and writes after state changes.
- Exposes functions to:
  - Create new projects (`createProject`) after validating input.
  - List/get projects for API responses.
  - Start/pause/resume processing and trigger background pipelines.
  - Compile completed chapters into a book (`compileBook`).
  - Fetch ElevenLabs voice metadata (`getVoices`).
- Implements manuscript parsing for single-voice and dual-voice modes, including preset showcase demo generation.
- Manages chunking of text, tracks SHA1 hashes per chunk to avoid stale audio reuse, and deletes obsolete MP3 fragments when manuscript content changes.
- Interacts with ElevenLabs’ REST API via `https.request`, and calls `ffmpeg` to merge and normalize audio.
- Emits status updates through a settable callback (`setUpdateHandler`), which the server registers for SSE broadcasting.

### `htmlTemplate.js`
- Returns the full HTML document (string literal) used for the browser interface.
- Embeds all client-side JavaScript required for:
  - Loading and displaying projects with progress bars.
  - Creating new projects, including demo-mode and preset showcase options.
  - Live controls for processing (start/pause/resume) and manual compilation.
  - Subscribing to SSE streams for real-time activity logs and UI updates.
  - Fetching available voices from ElevenLabs with an API key.

## Data Flow

1. **Project Creation**
   - Browser sends `POST /api/projects` with metadata, manuscript text, and ElevenLabs voices/settings.
   - `server.js` validates payload, defers to `projectService.createProject`, then responds with project ID and chapter count.
2. **Generation Pipeline**
   - `POST /api/projects/:id/start` transitions the project to `processing` and invokes `processProject`.
   - `processProject` iterates chapters, calls `processChapter` to split text, invoke ElevenLabs, persist chunk metadata, and assemble normalized audio.
   - Upon chapter completion, SSE updates stream to the browser.
   - When run completes, `compileBook` merges chapters into a full-length MP3 and notifies clients.
3. **Audio Playback & Downloads**
   - UI requests `/audio/chapters/...` or `/audio/book/...`. The server streams MP3 files residing under `output/`.
4. **Persistence**
   - Project state persists to `output/projects.json`. Any chunk/chapter/book MP3 files are stored beneath `output/chunks`, `output/chapters`, and `output/book` respectively.

## Key Behaviours and Safeguards

- **Chunk Invalidations**: Each generated audio chunk includes a SHA1 hash of the source text in its filename and metadata. When text changes, stale audio is removed so the next render reflects updated content.
- **ffmpeg Idempotence**: Normalization invokes `ffmpeg` with `-y` to overwrite previous output files, avoiding failures during reruns.
- **Zero-Tolerant Settings**: ElevenLabs voice settings now use nullish coalescing so legitimate `0` values (e.g., `style: 0`) are honoured instead of defaulting.
- **API Input Validation**: Both project creation and voice lookup endpoints guard against invalid JSON payloads and missing API keys before calling ElevenLabs.

## Directory Layout

```
manus/
├── app.js                # Entry point
├── server.js             # HTTP + SSE server
├── projectService.js     # Core logic & persistence
├── htmlTemplate.js       # Static HTML/JS front-end
├── TECHNICAL_OVERVIEW.md # This document
├── output/
│   ├── projects.json     # Persisted project metadata
│   ├── chunks/           # Per-chunk MP3s
│   ├── chapters/         # Chapter-level MP3s
│   └── book/             # Full audiobook MP3s
└── ...                   # Other project files
```

## Extensibility Notes

- Other front-ends (e.g., React SPA or Electron wrapper) can reuse `server.js` as-is by swapping `getHTML` with a different renderer.
- Additional data stores (SQLite, Redis) could be integrated by replacing the JSON read/write helpers inside `projectService.js`.
- Alternative TTS vendors can be incorporated by abstracting the `generateAudio` call.

## Known Constraints

- The service expects `ffmpeg` on the host PATH and a valid ElevenLabs API key.
- Port binding defaults to `3000`; set `PORT` to override when running multiple instances.
- SSE assumes long-lived HTTP connections; reverse proxies should be configured accordingly.

