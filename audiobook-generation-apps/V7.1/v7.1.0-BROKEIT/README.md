# Audiobook Generator (v7.1.0)

A powerful, standalone Node.js application for generating high-quality audiobooks using the ElevenLabs API. This tool provides a user-friendly web interface to manage your audiobook projects, from text-to-speech generation to final audio compilation.

## Features

*   **Single-File Simplicity:** The entire application runs from a single `app.js` file with no external NPM dependencies.
*   **Web Interface:** Intuitive dashboard (with Dark Mode!) to manage projects, edit manuscripts, and monitor progress.
*   **ElevenLabs Integration:** Full support for ElevenLabs' top-tier AI models including `Turbo v2.5`, `Flash v2.5`, and `Multilingual v2`.
*   **Smart Audio Processing:** Automatically splits text, generates audio chunks, merges them into chapters, and applies professional loudness normalization (EBU R128) using `ffmpeg`.
*   **Dual Voice Mode:** Innovative support for dialogue-heavy books, allowing you to switch between narrators or characters automatically using customizable delimiters (default `* * *`).
*   **Granular Control:** Override voice settings (stability, speed, style) on a per-chapter basis for precise direction.
*   **Demo Mode:** Create short samples of your book to test voices and settings without using a large amount of credits.
*   **Title Intro Generator:** Create specialized intro audio tracks for your book title and credits.
*   **Real-Time Progress:** Live updates on generation status via the web dashboard.

## Prerequisites

Before running the application, ensure you have the following installed:

1.  **Node.js**: (Version 14.0 or higher recommended). [Download Node.js](https://nodejs.org/)
2.  **FFmpeg**: **Critical Requirement.** This tool is used for processing audio files (merging and normalizing).
    *   **macOS:** `brew install ffmpeg`
    *   **Windows:** [Download FFmpeg](https://ffmpeg.org/download.html) and add it to your system PATH.
    *   **Linux:** `sudo apt install ffmpeg`
3.  **ElevenLabs API Key**: You need an account and API key from [ElevenLabs](https://elevenlabs.io/).

## Installation

1.  Download or clone this repository to your local machine.
2.  Navigate to the project directory:
    ```bash
    cd /path/to/audiobook-generator
    ```
3.  (Optional) Place your text manuscript in `manuscript.txt` for easy access, though you can also paste text directly into the UI.

## How to Run

Since this is a zero-dependency application, you do not need to run `npm install`. Simply start the application with Node.js:

```bash
node app.js
```

You should see output indicating the server has started:
```text
Server running at http://localhost:3000
```

## Usage Guide

### 1. Access the Dashboard
Open your web browser and go to `http://localhost:3000`.

### 2. Create a New Project
*   **Title & Author:** Enter the book's metadata.
*   **API Key:** Paste your ElevenLabs API key.
*   **Manuscript:** Paste your book's text. The app automatically detects chapters using Markdown headings (e.g., `# Chapter 1`, `## Chapter Two`) or standard "Chapter" keywords in multiple languages.
*   **Voice Selection:**
    *   **Single Mode:** One voice reads the entire text.
    *   **Dual Mode:** Assign different voices to different sections. Use the delimiter (default `* * *`) in your text to switch between Voice 1 and Voice 2.

### 3. Configure Settings
*   **Model:** Choose your preferred ElevenLabs model (e.g., `Turbo v2.5` for speed, `Multilingual v2` for quality).
*   **Voice Settings:** Adjust Stability, Similarity Boost, Style, and Speed to fine-tune the performance.
*   **Demo Mode:** Check this box to generate only a small portion of text for testing purposes.

### 4. Generate Audio
*   Click **"Review & Confirm"** to see an estimate of cost and structure.
*   Create the project and use the dashboard to **"Process Batch"** or **"Process Next"**.
*   You can watch the progress bar as chunks are created and merged into chapters.

### 5. Finalize & Download
*   Once all chapters are generated, click **"Finalize Audiobook"**.
*   The app will merge all chapters into a single MP3 file.
*   Links to download individual chapters or the full audiobook will appear in the dashboard.

## Output Structure

All generated files are stored in the `output/` directory created where you run the script:

*   `output/projects.json`: Saves your project settings and progress.
*   `output/chapters/`: Individual chapter MP3 files.
*   `output/book/`: The final complete audiobook files.
*   `output/chunks/`: (Temporary) Small raw audio segments.
*   `output/logs/`: detailed operation logs.

## Troubleshooting

**"ffmpeg command failed" or "ffmpeg not found":**
This means FFmpeg is not installed or not in your system's PATH. Please install FFmpeg and restart your terminal.

**"API error: 401":**
Your API key is invalid or missing. Double-check your ElevenLabs API key.

**"API error: 429":**
You have hit your ElevenLabs rate limit or quota. Check your subscription status on the ElevenLabs website.