# Audiobook Generator - Core Functional Specification

## High-Level Objective
Create a system that ingests a text manuscript and produces a high-quality, single-file audiobook MP3. The system must support long-form content by breaking it down into manageable pieces, processing them with high-quality AI text-to-speech (TTS), and reassembling them into a coherent final product with professional audio standards.

## Core Features & Logic

### 1. Manuscript Processing & Segmentation
*   **Chapter Detection:** The system must autonomously parse a raw text file and identify chapter boundaries.
    *   *Logic:* Look for standard Markdown headings (`#`, `##`) or explicit keywords (e.g., "Chapter 1", "Kapitel").
    *   *Outcome:* The manuscript is divided into a structured list of "Chapters," each with a title and index.
*   **Smart Chunking (The "Safety Valve"):** AI TTS APIs have character limits (e.g., ~5000 chars). The system must split chapter text into smaller "chunks" without breaking sentences.
    *   *Logic:* Split by sentence terminators (`.`, `?`, `!`) to ensure natural pauses, keeping chunks under the API limit.
*   **Dual-Voice / Multi-Character Parsing:** (Advanced) The system should support switching voices within a chapter based on a delimiter.
    *   *Logic:* Scan text for a user-defined token (e.g., `***`). Text before the token is Voice A; text after is Voice B. This allows for dialogue or alternating narrator styles.

### 2. Audio Generation Pipeline
*   **Voice Management:** Users must be able to select specific voice IDs (e.g., "Adam", "Rachel") for the project.
*   **API Integration:** The system sends text chunks to a TTS provider (e.g., ElevenLabs) with specific parameters:
    *   *Model:* (e.g., Turbo v2.5, Multilingual v2)
    *   *Settings:* Stability (consistency), Similarity (voice cloning accuracy), Style (exaggeration), Speed.
*   **Concurrency & Rate Limiting:** The system should process chunks efficiently but must handle API errors (e.g., "Rate Limit Exceeded") gracefully, ideally with automatic retries.

### 3. Audio Assembly & Post-Processing
*   **Chunk Merging:** Individual audio chunks must be concatenated seamlessly to form a Chapter.
*   **Loudness Normalization:** *Critical for quality.* The system must normalize the volume of each chapter to a standard broadcast level (e.g., EBU R128 or -16 LUFS) to prevent jarring volume jumps between sections.
*   **Final Compilation:** All completed chapters are merged into a single Book MP3.
*   **Gap Management:** The system should insert configurable silence (e.g., 2 seconds) between chapters in the final file to pace the listening experience.

### 4. Project State Management
*   **Persistence:** The system must save the state of every chapter (Pending, Processing, Completed) and segment (file paths, voice IDs).
*   **Resumability:** If the process crashes or is stopped, the system must be able to resume exactly where it left off, skipping already generated files.
*   **Logs:** Detailed activity logs should be kept for debugging and user transparency.

### 5. User Experience (UX) Requirements
*   **Real-Time Feedback:** The user must see live progress (e.g., "Processing Chapter 1, Segment 3/5").
*   **Cost Estimation:** Before generation, provide an estimate of the character count/cost.
*   **Preview/Demo:** Allow users to generate a short "Demo" (e.g., first 2 segments of 2 chapters) to test settings before committing to the full book.
*   **Asset Management:** Users should be able to delete projects, optionally keeping the final "Book" file while clearing the thousands of temporary "chunk" files.
*   **Title Intro Generator:** A specific tool to generate a "Title/Credits" intro file (e.g., "Narrated by...") that is prepended to the book.

## Creative Opportunities for Redesign

While the logic above is fixed, the *expression* of these features allows for vast creativity:

*   **The "Manuscript First" Approach:** Instead of a form, imagine a rich text editor where highlighting text allows you to assign a voice directly, eliminating the need for abstract "tokens" like `***`.
*   **The "Studio" Metaphor:** instead of a list of files, visualize the book as a timeline or a mixing desk. Show waveforms for each chapter.
*   **Interactive Costing:** As the user types or pastes text, show a live "Receipt" ticking up in the corner, gamifying the budget management.
*   **Voice Casting:** Instead of a dropdown list, present a "Casting Call" interface where users can audition voices against a sample of *their specific text*.
*   **Non-Linear Processing:** Allow users to click "Generate" on Chapter 10 while Chapter 1 is still editing. The backend handles the queue.

## Technical Stack Agnosticism
This logic can be implemented in Python (FastAPI), Go, Rust, or a desktop Electron app. The key is the **Pipeline**:
`Text -> Segmentation -> TTS Generation -> Storage -> Normalization -> Merge`
