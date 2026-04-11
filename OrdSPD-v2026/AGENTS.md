# Repository Guidelines

## Project Structure & Module Organization
`ordSPD/index.html` is the runtime entry point and wires all ES module scripts.

`ordSPD/javaScript/` contains app behavior. Key modules include `IframeManager.js` (grid creation/selection), `ContentLoader.js` (preload + remote loading), `UIController.js` (UI actions), and settings/key handling modules.

`ordSPD/css/` is split by concern (`grid-container.css`, `left-column-layout.css`, `button-styles.css`, etc.). Keep new styles in the closest existing file instead of creating broad catch-all stylesheets.

`ordSPD/REFERENCE FILES/` and `ordSPD/UNUSED OR OLD FILES/` are archival. Do not place new production code there.

## Build, Test, and Development Commands
This project is a static web app (no build step or package manifest in this directory).

`cd ordSPD`  
Move to the app root.

`python3 -m http.server 8080`  
Run locally and open `http://localhost:8080`.

`git status`  
Check changed files before committing.

## Coding Style & Naming Conventions
Use vanilla ES modules (`import`/`export`) and browser-compatible APIs.

Use 2-space indentation in HTML/CSS and keep JavaScript indentation consistent with surrounding code.

Follow existing naming patterns:
- JavaScript modules: PascalCase filenames (example: `IframeSelectionManager.js`)
- JavaScript symbols: camelCase (example: `postMessageToSelectedIframes`)
- CSS classes/files: kebab-case (example: `.iframe-wrapper`, `text-and-menu-styles.css`)

Keep comments brief and focused on non-obvious behavior.

## Testing Guidelines
There is no automated test suite in `ordSPD` yet. Validate changes manually in browser:
- Page loads with no console errors
- 36 pad iframes render
- `Load`, `Random Mix`, `Clear All`, `Save`, and settings load flows work
- Keyboard shortcuts and user guide toggle still function

Include manual test notes in each PR.

## Commit & Pull Request Guidelines
Recent history is mixed; prefer clear, scoped commit messages going forward, e.g.:
- `feat(spd): add pad selection hotkey`
- `fix(ui): restore load button visibility on fetch failure`

PRs should include:
- What changed and why
- Linked issue/task (if available)
- Screenshots for UI changes
- Manual verification checklist

## Security & Configuration Tips
`ContentLoader.js` fetches remote HTML/JSON into iframes. Only use trusted sources and preserve strict origin handling for `postMessage` interactions.
