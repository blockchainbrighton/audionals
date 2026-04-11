# Audiobook Studio // Gen-3

## Project Overview

**Audiobook Studio // Gen-3** is a web-based application designed to assist in the creation of audiobooks using AI-generated voices (specifically ElevenLabs). It provides a streamlined workflow for parsing manuscripts, assigning voices (including dual-voice narration), generating audio segments, and merging them into chapter files.

### Key Features
*   **Manuscript Parsing:** Automatically detects chapters and splits text into manageable chunks using sentence-aware logic.
*   **Multi-Language Support:** Recognizes chapter headings in various languages (English, German, Spanish, French, etc.).
*   **Voice Management:** Supports both browser-native synthesis and ElevenLabs API.
*   **Dual Voice Mode:** Allows assigning different voices to different parts of the text using delimiters.
    *   *Supported Delimiters:* Defaults to `* * *` (common in romance/dual-POV novels).
*   **Project Management:** Save and load multiple projects (stored as JSON files on the server).
*   **Audio Visualization:** Real-time frequency bar visualizer during playback.
*   **Audio Processing:** Merges generated audio chunks into single chapter files using FFmpeg.
*   **Protective Queuing:** Server-side concurrency control prevents API rate limits and local resource exhaustion.
*   **Local Caching:** Caches generated audio segments to avoid redundant API calls.

## Architecture

The project consists of a lightweight Node.js backend and a Single Page Application (SPA) frontend.

### Backend (`src/backend/server.js`)
*   **Server:** Native Node.js `http` server.
*   **Queuing System:** Implements `AsyncQueue` to throttle concurrent tasks.
    *   **ElevenLabs Queue:** Limits concurrent API requests to 2.
    *   **FFmpeg Queue:** Serializes audio merging (limit 1) to prevent CPU/IO overload.
*   **API Endpoints:**
    *   `GET /`: Serves the frontend.
    *   `GET /output/...`: Serves generated audio files.
    *   `GET/POST /api/projects`: Lists and saves projects (using individual JSON files in `output/projects/`).
    *   `GET /api/projects/:id`: Loads a specific project.
    *   `POST /api/generate`: Proxies requests to ElevenLabs API (queued).
    *   `POST /api/merge-chapter`: Invokes `ffmpeg` to concatenate audio chunks (queued).
*   **File System:**
    *   `output/projects/`: Stores individual project JSON files.
    *   `output/chunks/`: Cached audio segments.
    *   `output/chapters/`: Merged chapter files.

### Frontend (`src/frontend/index.html`)
*   **UI:** Custom HTML/CSS interface with a dark mode "Studio" aesthetic.
    *   *Responsive:* Uses CSS Grid with media queries for tablet/laptop support.
    *   *Accessible:* Full keyboard navigation and ARIA labels.
    *   *Visuals:* Includes a canvas-based audio visualizer and timeline highlighting ("Karaoke" style).
*   **Logic:** Embedded JavaScript handles state management, text parsing, and API communication.
    *   *Batch Processing:* Uses `Promise.all` with batching (limit 5) to efficiently feed the server queue without overwhelming the browser's network stack.
    *   *Text Analysis:* Validated support for Spanish chapter headers and standard dual-voice formatting.
*   **Audio Engine:** Hybrid engine supporting `window.speechSynthesis` (browser) and HTML5 Audio (server/ElevenLabs files) with `AnalyserNode` integration.

## Usage

### Prerequisites
*   **Node.js**: Required to run the server.
*   **FFmpeg**: Must be installed and accessible in the system PATH.
*   **ElevenLabs API Key**: Required for high-quality audio generation.

### Running the Application
1.  **Start the Server:**
    ```bash
    node src/backend/server.js
    ```
    The server will start on `http://localhost:3000`.

2.  **Open the Interface:**
    Navigate to `http://localhost:3000` in your web browser.

3.  **Workflow:**
    *   **Manage Projects:** Use the "📂 Projects" button to save your work or load previous sessions.
    *   **Connections:** Enter your ElevenLabs API key in the "Connections" tab.
    *   **Input:** Paste your manuscript. Use `# Chapter Name` to separate chapters.
        *   *Tip:* For Dual Voice, use `* * *` to switch characters.
    *   **Analyze & Generate:** Parse the text and generate audio.
    *   **Playback:** Use the timeline to play segments. Watch the visualizer in the control bar.

## File Structure

*   `src/backend/server.js`: Main server entry point.
*   `src/frontend/index.html`: Complete frontend application code.
*   `output/`: Directory where all generated content is stored.
    *   `projects/`: Saved project state files.
    *   `chunks/`: Individual audio segments.
    *   `chapters/`: Merged chapter files.
