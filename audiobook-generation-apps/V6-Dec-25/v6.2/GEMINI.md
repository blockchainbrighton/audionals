# Audiobook Generator (v6.0)

## Project Overview

This is a standalone, single-file Node.js application designed to generate audiobooks using the ElevenLabs API. It provides a web-based interface for managing projects, configuring voices, and monitoring the generation process.

**Key Features:**
*   **ElevenLabs Integration:** Supports multiple models (Multilingual v2, Turbo v2, Flash v2, etc.) for high-quality text-to-speech.
*   **Web Interface:** Built-in HTML/CSS frontend served directly by the application.
*   **Audio Processing:** Uses `ffmpeg` to merge audio chunks, normalize volume, and handle file management.
*   **Real-time Updates:** Uses Server-Sent Events (SSE) to provide progress updates to the frontend.
*   **Project Management:** Saves project state and progress to local JSON files.

## Prerequisites

1.  **Node.js:** The application runs on the Node.js runtime.
2.  **FFmpeg:** This is **critical** for audio processing (merging chunks, normalizing audio). It must be installed and available in your system's PATH.
3.  **ElevenLabs API Key:** You will need a valid API key from ElevenLabs to generate audio.

## Getting Started

### 1. Setup
Ensure you are in the project directory:
```bash
cd /path/to/v6.0
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

*   **`app.js`**: The core application file. It contains:
    *   HTTP server and API endpoints.
    *   Static file serving (including the embedded HTML frontend).
    *   Business logic for interacting with ElevenLabs.
    *   Audio processing logic using `spawn` to call `ffmpeg`.
*   **`output/`**: The working directory for generated content (automatically created).
    *   `projects.json`: Stores the state of all audiobook projects.
    *   `chunks/`: Temporary small audio segments generated from text.
    *   `chapters/`: Merged chapter audio files.
    *   `book/`: Final compiled audiobook files.
    *   `titles/`: Generated title/intro audio files.
*   **`manuscript.txt`**: Example input text file (optional).

## Development & Architecture

*   **Dependencies:** The project uses **only** standard Node.js libraries (`http`, `https`, `fs`, `path`, `child_process`, `url`). No `npm install` is required for the node application itself.
*   **Configuration:** Key constants (ports, directories, model definitions) are defined at the top of `app.js`.
*   **Data Persistence:** All data is stored locally in `output/projects.json`.
*   **Audio Pipeline:**
    1.  Text is split into chunks.
    2.  ElevenLabs API generates audio for each chunk.
    3.  `ffmpeg` merges chunks into chapters.
    4.  `ffmpeg` normalizes chapter audio (Loudness Normalization).
    5.  `ffmpeg` merges chapters into the final book.

## Common Tasks

*   **Adding New Models:** Update the `ELEVEN_MODEL_DEFINITIONS` array in `app.js`.
*   **Adjusting Audio Settings:** Modify the `generateAudio` or `normalizeAudio` functions in `app.js`.
*   **Frontend Changes:** Edit the `getHTML()` function at the bottom of `app.js`.

## Troubleshooting

*   **FFmpeg Errors:** If audio processing fails, ensure `ffmpeg` is installed and accessible from your terminal.
*   **API Errors:** Check your ElevenLabs API key and quota.
*   **Port Conflicts:** If port 3000 is in use, modify the `PORT` constant in `app.js`.
