# One-Click Audiobook Generator

This script automates the process of converting a text manuscript into a high-quality audiobook using ElevenLabs' text-to-speech API. It's designed to be simple to use, requiring minimal configuration to get started.

## Features

- **Versatile Manuscript Loading**: Supports various file formats including TXT, DOCX, MD, and PDF.
- **Intelligent Text Chunking**: Automatically splits the manuscript at chapter or scene boundaries, respecting the limitations of the selected TTS model.
- **Efficient and Resilient TTS**: Utilizes asynchronous requests to ElevenLabs for parallel processing of text chunks and includes resilient retries for failed requests.
- **Comprehensive Audio Output**: Generates individual MP3 files for each chapter, a fully stitched audiobook, and a 2-minute quality control reel.
- **Audio Quality Assurance**: Performs loudness normalization to ensure consistent volume levels across the audiobook.
- **Basic ID3 Tagging**: Adds essential metadata such as title and author to the generated audio files.

## Prerequisites

Before you begin, ensure you have the following:

- Python 3.7+
- An active ElevenLabs API key.
- The `ffmpeg` command-line tool installed and accessible in your system's PATH. This is required for audio manipulation by the `pydub` library.

## Installation

1.  **Clone the repository or download the script.**

2.  **Install the required Python dependencies.**
    It is recommended to use a virtual environment to manage dependencies.

    ```bash
    pip install httpx tenacity python-dotenv pydub mutagen python-docx pdfminer.six markdown beautifulsoup4
    ```

## Configuration

This application is configured through environment variables. You can set these in your operating system or create a `.env` file in the same directory as the script.

### Required Environment Variables

-   `ELEVEN_API_KEY`: Your API key for the ElevenLabs service.
-   `INPUT_PATH`: The full path to your manuscript file (e.g., `/path/to/your/book.docx`).
-   `BOOK_TITLE`: The title of the book.
-   `BOOK_AUTHOR`: The author of the book.

### Optional Environment Variables

-   `PREF_VOICES`: A comma-separated list of preferred voice names from ElevenLabs (e.g., "Jessica,Sarah"). The script will use the first available voice from this list. Defaults to "Jessica,Sarah".
-   `ELEVEN_MODEL`: The ElevenLabs model to use for text-to-speech conversion. Defaults to "eleven_turbo_v2_5".
-   `CONCURRENCY`: The number of concurrent requests to send to the ElevenLabs API. Defaults to "8".
-   `OUTPUT_DIR`: The directory where the generated audio files will be saved. Defaults to `./output/<slug-of-book-title>`.

### Example `.env` file