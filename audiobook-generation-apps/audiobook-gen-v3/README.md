# Dual-Voice Audiobook Generator v2.1

This Python script automates the creation of a dual-voice audiobook from a manuscript file using the ElevenLabs Text-to-Speech (TTS) API.

This version is specifically designed to read chapter titles and narrator headings aloud, making it ideal for manuscripts where these headings are part of the intended listening experience. It intelligently detects which character starts each chapter and handles point-of-view switches within chapters.

## Key Features

-   **Multi-Format Input**: Loads manuscripts from `.txt`, `.docx`, `.md`, and `.pdf` files.
-   **Smart Narrator Synthesis**:
    -   **Speaks Chapter and Narrator Headings**: Intentionally includes headings like "Chapter One. Demetri." and "DIANA." in the generated audio.
    -   **Automatic Voice Assignment**: Detects the starting narrator for each chapter by checking for the character's name in the chapter header.
    -   **Alternating Voices**: Correctly alternates between two voices whenever a `***` voice-switch marker is found in the text.
    -   **Clean Audio**: Strips `***` markers to avoid non-verbal sounds in the final audio.
-   **Efficient Processing**: Uses `asyncio` to process multiple text chunks in parallel, significantly speeding up generation time.
-   **Robust & Resilient**: Implements sentence-aware chunking to respect prosody and automatically retries failed API requests.
-   **Professional Output**:
    -   Generates an individual MP3 file for each chapter.
    -   Stitches all chapters into a single master audiobook file.
    -   Creates a 2-minute "Quality Control" reel for quick review.
    -   Applies loudness normalization and basic ID3 tagging (Title, Author, Album) to all output files.

## Requirements

1.  **Python 3.8+**
2.  **FFmpeg**: The script relies on FFmpeg for audio processing. You must have it installed and available in your system's PATH.
    -   **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add the `bin` folder to your PATH.
    -   **macOS**: `brew install ffmpeg`
    -   **Linux**: `sudo apt-get install ffmpeg` or `sudo yum install ffmpeg`
3.  **Python Packages**: Install the required packages using pip:
    ```bash
    pip install -r requirements.txt
    ```
    Your `requirements.txt` file should contain:
    ```
    httpx
    tenacity
    python-dotenv
    pydub
    mutagen
    python-docx
    pdfminer.six
    markdown
    beautifulsoup4
    ```

## Setup & Configuration

The script is configured using environment variables, which can be placed in a `.env` file in the same directory.

1.  Create a file named `.env`.
2.  Add the following variables:

| Variable           | Required? | Description                                                                                                                                                                                          | Example                                      |
| ------------------ | :-------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `ELEVEN_API_KEY`   |    **Yes**    | Your API key for ElevenLabs.                                                                                                                                                                         | `xi_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`           |
| `INPUT_PATH`       |    **Yes**    | The path to your manuscript file.                                                                                                                                                                    | `manuscript.docx`                            |
| `BOOK_TITLE`       |    **Yes**    | The title of the book.                                                                                                                                                                               | `The Accidental SEAL's Pregnancy`            |
| `BOOK_AUTHOR`      |    **Yes**    | The author of the book.                                                                                                                                                                              | `Katie Knight & Leslie North`                |
| `PREF_VOICES`      |    **Yes**    | Two comma-separated voice names from your ElevenLabs account. **The first name is Voice A, the second is Voice B.** These names are case-insensitive and used to detect the starting chapter narrator. | `Demetri,Diana`                              |
| `ELEVEN_MODEL`     |    No     | The ElevenLabs model to use.                                                                                                                                                                         | `eleven_turbo_v2_5` (default)                |
| `CONCURRENCY`      |    No     | The number of parallel TTS jobs to run.                                                                                                                                                              | `8` (default)                                |
| `OUTPUT_DIR`       |    No     | The directory where the audio files will be saved. Defaults to `./output/<book-title-slug>`.                                                                                                          | `./audiobooks/the-accidental-seals-pregnancy` |

## Manuscript Formatting

For the script to work correctly, your manuscript should follow these formatting conventions:

1.  **Chapter Breaks**: Chapters should be marked with lines starting with "Chapter", "Kapitel", "Part", or a Markdown heading (`#`).

    ```
    Kapitel Eins.
    ```

2.  **Starting Narrator**: Each chapter must clearly indicate its starting narrator in the first few lines. The script looks for the names you defined in `PREF_VOICES` to assign the correct starting voice. **The script is designed to read these headings aloud.**

    ```    Kapitel Eins.
    Demetri.
    
    Demetri Lewis spielte gern den Helden...
    ```
    *Expected Audio Output: "Kapitel Eins. Demetri. Demetri Lewis spielte gern den Helden..."*

3.  **Mid-Chapter Voice Switch**: To switch from one narrator to the other within a chapter, place `***` on its own line. The `***` will be removed, but the subsequent narrator heading will be spoken.

    ```
    ...Demetri would have to be satisfied with that.
    
    ***
    
    DIANA.
    
    Oh man, I hadn't been this nervous...
    ```
    *Expected Audio Output: "...Demetri would have to be satisfied with that. [pause] DIANA. Oh man, I hadn't been this nervous..."*

## Usage

Once your `.env` file is configured and your manuscript is correctly formatted, simply run the script from your terminal:

```bash
python audiobook_generator.py```

The script will print its progress and let you know when it's finished.

## Output

The generated files will be placed in the specified `OUTPUT_DIR`. The folder will contain:

-   `_full_book.mp3`: The complete audiobook, with chapters stitched together.
-   `_qc_reel_2m.mp3`: A 2-minute sample from the beginning of the book for a quick quality check.
-   `01_Chapter.mp3`, `02_Chapter.mp3`, etc.: Individual MP3 files for each chapter.
-   `temp_chunks/`: A temporary folder containing all the small audio clips, which is automatically deleted upon successful completion.