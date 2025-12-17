# Audiobook Generator (v7.1.0)

## Project Overview

This is a standalone, single-file Node.js application designed to generate high-quality audiobooks using the ElevenLabs API. It features a robust web-based interface for managing projects, configuring voices with granular control, and monitoring the generation process in real-time.

**Key Features:**
*   **ElevenLabs Integration:** Comprehensive support for the latest models including `Turbo v2.5`, `Flash v2.5`, `Multilingual v2`, and more.
*   **Web Interface:** A responsive, dark-mode capable HTML/CSS frontend served directly by the application.
*   **Dual Voice Mode:** Advanced parsing for multi-narrator projects using customizable delimiters.
*   **Granular Control:** Per-chapter settings overrides for voice stability, similarity, style, and speed.
*   **Audio Processing:** Utilizes `ffmpeg` for seamless chunk merging, loudness normalization (EBU R128), and final book compilation.
*   **Project Management:** Local JSON persistence (`projects.json`) ensures progress is saved and can be resumed at any time.
*   **Demo Mode:** Quickly generate short samples to test voice settings before committing credits.
*   **Title/Intro Generation:** Dedicated tool for creating standalone title and introduction audio files.

## Prerequisites

1.  **Node.js:** The application requires a standard Node.js runtime (v14+ recommended).
2.  **FFmpeg:** **Critical dependency** for all audio processing (merging, converting, normalizing). It must be installed and accessible via the system PATH.
3.  **ElevenLabs API Key:** A valid API key is required to fetch voices and generate audio.

## Getting Started

### 1. Setup
Ensure you are in the project directory:
```bash
cd /path/to/v7.1.0
```

### 2. Run the Application
Start the server using Node.js:
```bash
node app.js
```

### 3. Access the Interface
Open your web browser and navigate to:
```
http://localhost:3000
```

## Project Structure

*   **`app.js`**: The monolithic application file containing:
    *   HTTP/API server logic.
    *   Static asset serving (embedded HTML/CSS).
    *   ElevenLabs API client.
    *   Text parsing and segmentation logic.
    *   `ffmpeg` process management.
*   **`output/`**: The auto-generated workspace:
    *   `projects.json`: Database of all project states.
    *   `chunks/`: Temporary storage for raw audio segments.
    *   `chapters/`: Completed, normalized chapter files.
    *   `book/`: The final concatenated audiobook files.
    *   `titles/`: Generated intro/title audio files.
    *   `logs/`: Detailed JSONL logs for debugging.

## Development & Architecture

*   **Zero Dependencies:** The core `app.js` uses only standard Node.js modules (`http`, `https`, `fs`, `path`, `child_process`, `url`).
*   **Configuration:** Key constants (ports, directories, model definitions) are defined at the top of `app.js`.
*   **Audio Pipeline:**
    1.  **Parsing:** Text is parsed into chapters and split into optimized chunks (~4500 chars).
    2.  **Generation:** Chunks are sent to ElevenLabs concurrently (respecting batch limits).
    3.  **Merging:** Chunks are concatenated into chapter files.
    4.  **Normalization:** Chapter audio is normalized to -16 LUFS (standard for podcasts/audiobooks).
    5.  **Compilation:** Chapters and intro files are merged into the final audiobook with configurable silence gaps.

## Common Tasks

*   **Adding New Models:** Update the `ELEVEN_MODELS` array in `app.js`.
*   **Adjusting Audio Settings:** Modify default constants in `app.js` or use the UI to override settings per project or chapter.
*   **Frontend Customization:** Edit the `getHTML()` function within `app.js`.

## Troubleshooting

*   **FFmpeg Errors:** Verify installation by running `ffmpeg -version` in your terminal.
*   **API Errors:** Check `output/logs/` for detailed error messages regarding API limits or authentication.
*   **Port Conflicts:** Modify the `PORT` constant in `app.js` if port 3000 is unavailable.