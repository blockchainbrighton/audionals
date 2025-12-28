# Manuscript & Format Analysis

## 📄 Text Structure
*   **Language:** Spanish (`es`).
*   **Format:** Standard novel structure with clear chapter headings.
*   **Chapter Headers:** detected format `Capítulo [number]: [Character Name]`.
    *   *Example:* `Capítulo uno: Piper.`
    *   *Status:* **Fully Supported.** The current regex configuration for Spanish (`['Capítulo', 'Capitulo']`) will correctly identify these lines as new chapters.

## 🗣️ Voice Switching (`* * *`)
*   **Delimiter Found:** The text uses `* * *` centered on its own line to indicate scene/perspective changes.
*   **Mechanism:**
    *   The application's "Dual Voice" mode is designed to look for a specific token to split text segments.
    *   **Default Token:** The default token is `* * *`, which matches your manuscript exactly.
*   **Behavior:**
    *   When the system encounters `* * *`, it treats it as a "Voice Switch" signal.
    *   It will automatically toggle from the **Current Voice** to the **Next Voice** (e.g., Voice 1 -> Voice 2).
*   **Context from Sample:**
    *   *Text:* `...puertas del ascensor. 
 * * * 
 Vincent. 
 Por fin podía...`
    *   *Result:*
        1.  **Segment 1:** Ends at "...ascensor." (Read by Voice 1, e.g., Piper).
        2.  **Switch:** `* * *` triggers the change.
        3.  **Segment 2:** Starts with "Vincent. Por fin..." (Read by Voice 2, e.g., Vincent).

## 💡 Recommendations for "Una pareja (im)perfecta"
1.  **Project Setup:**
    *   Select **Dual Voice** mode.
    *   Set **Voice 1** to a female voice (Piper).
    *   Set **Voice 2** to a male voice (Vincent).
    *   Ensure the **Voice Switch Token** is set to `* * *` (default).
2.  **Chapter 1 Handling:**
    *   The chapter starts with Piper. The system will default to Voice 1.
    *   When it hits `* * *`, it will switch to Voice 2 (Vincent) for the second half.
    *   **Success:** This will work automatically without manual editing.
3.  **Automatic Detection:**
    *   The system scans the first few lines of a chapter to guess the starting voice.
    *   Since your headers are "Capítulo uno: **Piper**", if you name your Voice 1 "Piper" in the settings, the system will auto-assign the start of the chapter to her.

## ✅ Conclusion
Your manuscript is **perfectly formatted** for this application's automated features. No manual reformatting is required.
