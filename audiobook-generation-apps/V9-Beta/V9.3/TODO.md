# Future Development Roadmap & TODOs

## 🧪 Simulation & Testing Report
*Generated based on code analysis and persona simulation (Indie Author, Audio Engineer, Publisher, Accessibility Tester).*

### 1. UX/UI Analysis
*   **Visual Hierarchy:** The dark mode aesthetic is strong, but the fixed grid layout (`350px 1fr 300px`) breaks on smaller laptop screens or tablets.
*   **Editor Limitations:** The `<textarea>` is too basic. It lacks syntax highlighting, visual segment markers, or "karaoke mode" (highlighting text as it is read), which is standard in modern text-to-speech tools.
*   **Accessibility (A11y):** The custom "Voice Dropdown" lacks keyboard navigation (`Tab` / `Arrow` keys) and ARIA labels, making it unusable for screen readers.
*   **Feedback Loops:** The "Console" is useful for debugging but too technical for average users. Error messages (e.g., API limits) need to be modal or inline alerts.

### 2. Persona Feedback
*   **The Indie Author:** "I love the cost calculator, but I can't save multiple versions of a chapter. If I regenerate, the old take is gone forever."
*   **The Audio Engineer:** "I need to adjust the pause duration between paragraphs. The 1000-char split is too arbitrary and cuts sentences in weird places."
*   **The Publisher:** "This produces raw MP3s. I need ready-to-upload files with ID3 tags (Author, Title, Cover Art) and Chapter metadata."

---

## 📋 Comprehensive TODO List

### 🛑 Critical Fixes (High Priority)
- [x] **Fix Responsive Layout:** Replace fixed pixel widths with CSS Grid/Flex `minmax` and media queries to support screens < 1200px.
- [x] **Accessibility Overhaul:**
    - [x] Make the custom Voice Dropdown keyboard focusable (`tabindex="0"`).
    - [x] Add `aria-labels` to all icon-only buttons (Play, Regenerate).
    - [x] Ensure color contrast ratios meet WCAG AA standards (especially text-dim colors).
- [x] **Text Splitting Logic:** The current "space/newline" splitting is fragile. Implement a sentence-boundary-aware splitter (using `Intl.Segmenter` or a dedicated NLP library) to prevent cutting audio mid-sentence.

### 🎨 UI/UX Enhancements
- [x] **Project Management UI:**
    - [x] A "Load Project" dashboard to switch between books without overwriting `localStorage`.
    - [x] "Save" functionality to persist state to server-side JSON files.
- [x] **Waveform Visualization:** Added real-time frequency bar visualizer in the control bar.
- [ ] **Rich Text Editor:** Replace `<textarea>` with a lightweight rich text editor (e.g., Quill, TipTap).
- [ ] **"Karaoke" Playback:** *Partially Implemented* (Highlighting active segment in Timeline, full editor overlay pending).

### 🛠️ Feature Requests
- [ ] **Advanced Audio Controls:**
    - [ ] **Pause Insertion:** Ability to add `[pause: 2s]` tags in the text that the engine respects.
    - [ ] **Pronunciation Dictionary:** A "Find & Replace" map for phonemes.
- [ ] **Export & Mastering:**
    - [ ] **ID3 Tagging:** UI to set Book Cover, Author, Year, and embed them into the final MP3s.
    - [ ] **M4B Export:** Option to bundle all chapters into a single `.m4b` audiobook file with chapter markers.
    - [ ] **Loudness Normalization:** Use `ffmpeg-normalize` on the backend.
- [ ] **Voice "Casting" Board:** A visual drag-and-drop interface to assign voices to characters detected in the text.

### ⚙️ Backend & Architecture
- [x] **Protective Job Queue:** Implemented server-side `AsyncQueue` to throttle ElevenLabs API calls (limit 2) and FFmpeg merges (limit 1), protecting resources.
- [ ] **Secure API Proxy:** Move the ElevenLabs API calls entirely to the server-side.
- [ ] **Unit Tests:**
    - [ ] Test text splitting logic.
    - [ ] Test FFmpeg merging stability.
- [x] **Manuscript Validation:** Verified compatibility with Spanish chapter headers and `* * *` dual-voice formatting.

### 🐛 Known Issues to Investigate
- [ ] **Dual Voice Token Handling:** Verify if `* * *` tokens are perfectly stripped or if they leave silence gaps.
- [ ] **Browser Cache:** Large audio blobs might crash the browser if not properly garbage collected. Verify `URL.revokeObjectURL` usage.

---

## 📅 Phasing Plan

*   **Phase 1 (Completed):** Layout fixes, text splitter improvements, accessibility, project saving/loading, audio visualizer, backend queuing system, manuscript validation.
*   **Phase 2 (Core):** Rich text editor, Pronunciation Dictionary, Pause insertion.
*   **Phase 3 (Pro):** ID3/M4B Export, Loudness Normalization.
