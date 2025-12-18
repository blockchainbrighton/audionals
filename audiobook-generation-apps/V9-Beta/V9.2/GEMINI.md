# Audiobook Studio // Gen-3

## Project Overview

**Audiobook Studio // Gen-3** is a web-based application designed to assist in the creation of audiobooks using AI-generated voices (specifically ElevenLabs). It provides a streamlined workflow for parsing manuscripts, assigning voices (including dual-voice narration), generating audio segments, and merging them into chapter files.

### Key Features
*   **Manuscript Parsing:** Automatically detects chapters and splits text into manageable chunks.
    *   *Update (Dec 2025):* Now uses a sentence-boundary-aware splitter to prevent cutting sentences in half.
*   **Multi-Language Support:** Recognizes chapter headings in various languages (English, German, Spanish, French, etc.).
*   **Voice Management:** Supports both browser-native synthesis (for testing) and ElevenLabs API (for high-quality production).
*   **Dual Voice Mode:** Allows assigning different voices to different parts of the text (e.g., Narrator vs. Character) using delimiters.
*   **Audio Processing:** Merges generated audio chunks into single chapter files using FFmpeg.
*   **Cost Estimation:** Provides real-time cost estimates based on character count and selected ElevenLabs models.
*   **Local Caching:** Caches generated audio segments to avoid redundant API calls and costs.

## Architecture

The project consists of a lightweight Node.js backend and a Single Page Application (SPA) frontend.

### Backend (`Vbeta_Server.js`)
*   **Server:** Native Node.js `http` server (no Express dependency detected).
*   **API Endpoints:**
    *   `GET /`: Serves the frontend (`Vbeta.html`).
    *   `GET /output/...`: Serves generated audio files.
    *   `GET/POST /api/projects`: Manages project metadata (stored in `output/projects.json`).
    *   `POST /api/generate`: Proxies requests to ElevenLabs API and caches results locally.
    *   `POST /api/merge-chapter`: Invokes `ffmpeg` to concatenate audio chunks.
*   **File System:**
    *   Stores generated audio in `output/chunks/`, `output/chapters/`, and `output/titles/`.
    *   Maintains logs in `output/logs/`.

### Frontend (`Vbeta.html`)
*   **UI:** Custom HTML/CSS interface with a dark mode "Studio" aesthetic.
    *   *Responsive:* Uses CSS Grid with media queries for tablet/laptop support.
    *   *Accessible:* Full keyboard navigation for custom dropdowns and ARIA labels for icon controls.
*   **Logic:** Embedded JavaScript handles state management, text parsing, and API communication.
*   **Audio Engine:** Hybrid engine supporting `window.speechSynthesis` (browser) and HTML5 Audio (server/ElevenLabs files).

## Usage

### Prerequisites
*   **Node.js**: Required to run the server.
*   **FFmpeg**: Must be installed and accessible in the system PATH for audio merging.
*   **ElevenLabs API Key**: Required for high-quality audio generation.

### Running the Application
1.  **Start the Server:**
    ```bash
    node Vbeta_Server.js
    ```
    The server will start on `http://localhost:3000`.

2.  **Open the Interface:**
    Navigate to `http://localhost:3000` in your web browser.

3.  **Workflow:**
    *   **Connections:** Enter your ElevenLabs API key in the "Connections" tab.
    *   **Project Setup:** Select Single or Dual voice mode and choose your voices.
    *   **Input:** Paste your manuscript into the text editor. Use `# Chapter Name` or standard headings (e.g., "Chapter 1") to separate chapters.
    *   **Analyze:** Click "1. Analyze & Parse" to break the text into segments.
    *   **Generate:** Click "2. Generate Audio" to start the text-to-speech process.
    *   **Playback/Download:** Use the timeline to play specific segments or download the merged chapter files from the server's output directory.

## File Structure

*   `Vbeta_Server.js`: Main server entry point.
*   `Vbeta.html`: Complete frontend application code.
*   `output/`: Directory where all generated content is stored.
    *   `chunks/`: Individual audio segments (cached).
    *   `chapters/`: Merged chapter files.
    *   `titles/`: Audio for book titles/credits.
    *   `projects.json`: Database of saved projects.

## Development Notes
*   **No Build Step:** The frontend is raw HTML/JS/CSS. No bundlers (Webpack/Vite) are required.
*   **Configuration:** Server constants (PORT, directories) are defined at the top of `Vbeta_Server.js`.
*   **State:** Frontend state is transient but leverages `localStorage` for API keys and manuscript text.