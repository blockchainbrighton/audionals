# Audiobook Studio V11 - Roadmap

## Phase 1: Foundation & Architecture Setup
- [x] **Project Initialization**
    - [x] Create root `package.json` for workspace management.
    - [x] Setup `frontend/` directory (React + Vite + TypeScript + Tailwind).
    - [x] Setup `backend/` directory (Node.js + Express + TypeScript).
    - [x] Configure `concurrently` script to run both servers.
- [x] **Backend Core**
    - [x] Implement basic Express server structure.
    - [x] Create API endpoints for Project management (CRUD).
    - [x] Set up SQLite database (`better-sqlite3`) for project metadata.
- [x] **Frontend Core**
    - [x] Initialize Layout (Sidebar, Header, Main Area) matching Design System.
    - [x] Implement basic "Project Setup" and listing view.

## Phase 2: TTS Integration (The Hybrid Engine)
- [x] **Backend TTS Service**
    - [x] Use `kokoro-tts` as the primary local engine.
    - [x] Implement Node.js -> Python bridge (`child_process`).
    - [x] Create `/api/voices` endpoint.
    - [x] Create `/api/generate` endpoint.
- [x] **Frontend Integration**
    - [x] Connect "Generate" button to Backend API.
    - [x] Implement manuscript editor with persistence.
    - [x] Add audio playback and download for generated files.

## Phase 3: Timeline & Advanced Features
- [x] **Timeline UI**
    - [x] Build visual timeline component (chapters, chunks).
    - [x] Implement "Dual Voice" logic (parsing `* * *` and assigning voices).
- [x] **Audio Processing**
    - [x] Move audio merging (FFmpeg) from Client (WASM) to Backend (System FFmpeg) for speed.
    - [x] Implement chapter-level audio merging.

## Phase 4: Polish & Migration
- [ ] **UX Refinement**
    - [ ] Add dark/light mode toggle (persisted).
    - [ ] Add keyboard shortcuts (Cmd+S to save, etc.).
- [ ] **Cleanup**
    - [ ] Archive legacy `js/` and `css/` folders.
    - [ ] Update `README.md` with installation instructions for the new stack.
