# GEMINI.md - Project Context & Memory

## Project Identity
**Name:** Audiobook Studio V11 (Browser/Local Hybrid)
**Status:** Phase 2 Complete (Core TTS Integration)

## Architectural Vision
The project has successfully transitioned to a **Hybrid Local Server** architecture.

### Current Architecture (Hybrid)
- **Frontend:** React 18, Tailwind CSS, Vite.
- **Backend:** Node.js (Express) + Python (Kokoro-82M Bridge).
- **TTS:** Local Kokoro-82M (Fast, High Quality).
- **Audio:** Server-side generation and static serving.
- **Storage:** SQLite (Project metadata and manuscripts).


## Key Directives
1.  **Local-First:** All data and generation must happen locally. No external cloud dependencies.
2.  **UX Priority:** The workflow must be guided (Setup -> Write -> Review -> Export).
3.  **Safety:** Do not break the existing `index.html` demo until the new app is ready to replace it.
4.  **Conventions:** Follow the "Design System" in docs (Inter font, specific color palette).

## Persistent Facts
- **User OS:** Darwin (macOS).
- **Docs Location:** `V11-Development-DOCS/`.
- **Primary weakness:** Single-threaded browser blocking during generation.
