# Audiobook Generator Guide

Welcome! This little app turns a written manuscript into a narrated audiobook using the ElevenLabs voices you already know. Everything happens from a browser page that the app serves locally, so you can follow along with clear status updates while chapters are generated one after another.

## What You Need Before You Start

- **Node.js** is required to run `audiobook_app.js` (any modern version works).
- **ffmpeg** must be available on your system so the app can stitch and normalise audio files.
- **An ElevenLabs API key** gives the app permission to look up voices and create speech.

## Starting the App

1. Open a terminal inside the `manus` folder.
2. Run `node audiobook_app.js`.
3. The server launches on <http://localhost:3000> and automatically opens your default browser. You can always reopen that address later if you close the tab.

The app immediately creates an `output` folder (with `chunks`, `chapters`, `book`, and a `projects.json` file) to keep your progress and audio safe between sessions.

## A Quick Tour of the Interface

- **Dashboard tab** – lists every project you have created. Each card shows how many chapters are finished out of those planned. Click any card to open a detailed view with logs, audio players, and controls.
- **New Book tab** – the form where you create a project. Supply your API key, load the available voices, and fill in the remaining details.

## Creating a New Audiobook

1. Paste your ElevenLabs API key and click **Load Voices**. The dropdowns will fill with voices you can use.
2. Enter the book title, optional author and language, and paste the manuscript text.
3. Choose the narration mode:
   - **Single Voice** – one narrator reads everything.
   - **Dual Voice** – the text alternates between two voices. Use the changeover token (default `***`) in the manuscript to switch between them.
4. (Optional) Set a chapter limit if you only want a portion generated right now.
5. (Optional) Toggle **Demo Mode** to craft a short sample. You can also try the **Preset Showcase** that speaks the same lines with multiple performance styles.
6. Adjust pacing sliders or apply a preset tone for each selected voice.
7. Submit the form. You will be told how many chapters were detected, and the Dashboard will show the new project.

### How Chapters Are Detected

The app scans the manuscript for headings that start with one to three hash symbols (for example `# Chapter 1`, `## Chapter Two`). Each heading becomes a chapter. If no headings are found, the whole manuscript is treated as a single chapter. In dual voice mode, the text inside a chapter is further divided by your changeover token so each voice takes turns automatically.

## Generating the Audiobook

Open the project card to see live progress and controls. The main buttons are:

- **Start Generation** – begins processing from the first unfinished chapter.
- **Pause** – halts after the current chunk finishes, keeping all existing audio.
- **Resume** – continues from the next unfinished chapter.

### What Happens Behind the Scenes

1. **Chapter queue** – Chapters run strictly in order. A later chapter never starts until the previous one has successfully completed.
2. **Chunk creation** – Each chapter (or dual-voice segment) is broken into sentence-sized chunks. This keeps the speech natural and reduces the chance that the API times out. Every chunk becomes its own MP3 inside `output/chunks`.
3. **Chapter assembly** – When all chunks of a chapter are ready, the app stitches them together and normalises the volume so playback is consistent. The finished chapter file lands in `output/chapters`, and the UI shows a playable audio control.
4. **Book compilation** – Once every planned chapter has a finished audio file, the app automatically joins them in order and writes the full audiobook to `output/book`. The download button in the project view will appear when that file is ready.

Throughout the process you will see log entries such as “Processing segment 3”, “Completed chapter: Chapter 2”, and “Merging chapters into full audiobook…”. If something goes wrong (for example, the ElevenLabs API rejects a request), the chapter status changes to **ERROR** and the log records the message so you know what to retry.

## Manual Book Compilation

Sometimes you might preview a few chapters and only later decide to combine them. The **Compile Completed Chapters** button inside the project modal does exactly that:

- It becomes active as soon as at least one chapter has a finished audio file.
- Clicking it builds a fresh audiobook from all currently completed chapters, even if the overall project is still in progress.
- A short activity message confirms the number of chapters merged. The download button updates to the newest file, and a “Last Compiled” timestamp appears near the top of the modal.
- If no chapters are ready, the button stays disabled and the app lets you know.

## Storage and Persistence

- **`output/projects.json`** keeps every project’s settings and progress so you can pause, close the server, and resume later without losing your place.
- **`output/chunks/`** houses the raw snippets created for each chunk.
- **`output/chapters/`** contains the polished chapter files after normalisation.
- **`output/book/`** stores the compiled audiobook. The latest file is always referenced in the dashboard.

Feel free to back up or archive these folders; the app respects existing audio and will skip reprocessing when it finds completed files.

## Demo Mode Highlights

- Limits the amount of text read per chapter and per segment so you can audition voices quickly.
- Optional “Preset Showcase” generates a short introduction to several curated voice styles using the same sample text.
- Demo runs still save their audio in the same folders, clearly marked in the interface with a DEMO badge.

## Tips for Smooth Runs

- Keep the browser tab open while generating so you can monitor progress, though the server keeps working even if you close it.
- Avoid editing or deleting chunk or chapter files mid-run; the app relies on those to detect what is already finished.
- If you pause, the app will halt after the current chunk finishes, ensuring you never end up with half-written audio.
- Re-running **Start Generation** on a completed project will skip every chapter that already has a finished file and move straight to compiling.

Enjoy crafting audiobooks with confidence—each step is laid out so you always know where you stand and what will happen next.

