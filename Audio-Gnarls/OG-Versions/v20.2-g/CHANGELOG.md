# Changelog – v20.2

## Easy wins & safe reductions
- Removed redundant `TAU` and `clamp` re-exports from `js/shapes.js` (not imported anywhere).
- Stripped long block comments (6+ lines) across JS files to reduce line count without changing behavior.
- Removed `console.log`, `console.debug`, and `console.trace` calls (kept `warn`/`error`) for leaner production code.
- Collapsed excessive blank lines for readability and fewer lines.
- Removed macOS resource files (`__MACOSX/`, `._*`) from the package.

All public identifiers and runtime behavior remain unchanged. Load order and script tags in `index.html` are preserved.
