# Harmonoids – TODO (Sprint Backlog)
*Last updated: 2025-06-10*

## ✅ Completed (since Alpha 0.1)
- [x] **Manual spawn toggle** (mode button + drop button)
- [x] UI polish: gradient buttons, blurred panel
- [x] AudioManager: selection beep & gate swoosh
- [x] Updated stats HUD (selected count)

## 🚧 In Progress
- [ ] Write unit tests for spawn‑mode edge cases
- [ ] Balance default spawn rate & dissonance thresholds
- [ ] Finalise art pass for Harmonoids (animated sprite)

## 📌 Next Up
- [ ] **Chord Builder** mode
    - [ ] Gate UI cycle indicator
    - [ ] Chord validation logic
- [ ] **Rhythm Rush** mode
    - [ ] Metronome ticker in AudioManager
    - [ ] Sync spawn cadence to BPM slider
- [ ] Responsive touch control layout
- [ ] Accessibility: colour‑blind palette toggle

## 🗓️ Deferred / Nice‑to‑have
- [ ] Level editor (drag‑and‑drop in‑browser)
- [ ] Cloud save via IndexedDB + optional sync
- [ ] Community workshop for sharing levels

## 🔍 Testing Checklist
- [ ] Harmonoid audio cleanup on entity destroy
- [ ] Gate open/close SFX dispatch exactly once per state change
- [ ] Performance budget: < 2 ms update, < 4 ms render on 1080p laptop

---
