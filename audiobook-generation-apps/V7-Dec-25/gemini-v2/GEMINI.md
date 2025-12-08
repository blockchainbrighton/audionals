# Project Overview
**Narrate.AI Studio (Audiobook Studio // Gen-3)** is a single-file, client-side web application designed to assist in the creation of audiobooks. It provides a dark-mode interface for editing manuscripts, organizing chapters, and generating audio using either standard browser voices or the ElevenLabs API.

# Architecture & Technology
*   **Type:** Single-File Web Application (HTML/CSS/JS).
*   **Frontend:** Vanilla JavaScript (ES6+), embedded CSS variables for theming.
*   **Storage:** Uses browser `localStorage` to persist:
    *   `ab_manuscript`: The text content of the book.
    *   `ab_api_el`: ElevenLabs API credentials (key and name).
*   **Audio Engine:**
    *   **Standard:** Uses the native Web Speech API (`window.speechSynthesis`).
    *   **Premium:** Integrates with ElevenLabs API (currently mocked in parts for safety/demo purposes).

# Getting Started
Since this is a standalone HTML file, no build process is required.

1.  **Run:** Open `gemini-v2.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).
2.  **Setup:**
    *   Navigate to the "Connections" tab to input an ElevenLabs API key if using premium voices.
    *   Select a voice in the "Project" tab.
    *   Paste text into the "Manuscript" editor.
3.  **Usage:**
    *   Click **"1. Analyze & Parse"** to break the text into chapters and chunks.
    *   Click **"2. Generate Audio"** to process the text (simulated or real depending on settings).
    *   **Play:** Click the Play (▶) button to listen to the entire project, or click individual text chunks in the right-hand timeline to play just that section.

# Key Features
*   **Manuscript Editor:** Large text area supporting basic chapter detection (via `#` or "Chapter X").
*   **Timeline Visualization:** Visualizes the book structure as cards and individual text chunks.
*   **Voice Tracking:** Displays which voice was used to generate each specific audio chunk.
*   **Smart Generation:** Prevents re-generating already completed sections and alerts when finished.
*   **Cost Estimation:** Real-time calculation of estimated costs based on character count and selected voice type.
*   **Hybrid Voice System:** Seamless switching between free browser voices and paid API voices.
*   **API Management:** Connect and Disconnect ElevenLabs API keys easily.
*   **Simulation Mode:** Option to simulate API calls to test the workflow without incurring costs.

# Development Conventions
*   **Structure:** All code is contained within `gemini-v2.html`.
    *   **CSS:** Located in the `<head>` style block. Uses CSS variables for easy theming.
    *   **JS:** Located at the bottom of the `<body>`. Logic is divided into classes:
        *   `STATE`: Centralized state management.
        *   `APIService`: Handles external API interactions.
        *   `AudioEngine`: Manages playback and voice synthesis.
        *   `dom`: Caches DOM elements.
*   **Logging:** A custom `LOG` object writes messages to the on-screen console panel.