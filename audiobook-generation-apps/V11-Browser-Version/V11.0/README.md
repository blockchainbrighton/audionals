# Audiobook Studio V11 (Hybrid Local Edition)

A professional-grade, local-first audiobook generation tool.

## Key Features
- **Local-First TTS:** Uses Kokoro-82M for high-quality, high-speed audio generation on your own hardware.
- **Hybrid Architecture:** React frontend for smooth UX, Node.js backend for reliable project storage, and Python for AI inference.
- **Dual Voice Support:** Assign different voices to narrator and character sections using `* * *` separators.
- **Chapter Merging:** Automatically stitches audio segments into full chapter files using FFmpeg.

## Prerequisites
- **Node.js:** v18+ 
- **Python:** v3.10+ (specifically for the Kokoro TTS engine)
- **FFmpeg:** Installed on your system path.

## Setup & Installation

1. **Install Dependencies:**
   ```bash
   npm run install:all
   ```

2. **Start Development Servers:**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## How to use the Dual Voice feature
In your manuscript:
```
# Chapter 1
This is the narrator speaking.
* * *
"This is a character speaking," the man said.
* * *
The narrator continues here.
```
Assign different voices in the **Voice Casting** panel on the right.

## Project Structure
- `frontend/`: React + Vite + TypeScript (UI)
- `backend/`: Node.js + Express (API & Project Storage)
- `backend/python/`: Python scripts for TTS inference.
- `local-tts-engines/`: Pre-configured local AI models.
