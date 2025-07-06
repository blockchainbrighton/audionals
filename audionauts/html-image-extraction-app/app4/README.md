# Ordinal Snapshot Tool

**This tool snapshots and compares images or Ordinals HTML inscriptions for Bitcoin Ordinals.**

- For local dev, enable `local-dev-patch.js`.
- For production/on-chain, do not include any dev patch files or domain references.

**Usage:**
- Enter a full Ordinals content URL, path, or inscription ID.
- Click "Batch Snapshot & Compare Methods."
- Snapshots will display as images and base64 text.

**Production rules:**
- All code must be single-domain, no external resource patching.
- Only use code from `app.js` (no dev patch).

*html2canvas (MIT) is required for HTML DOM snapshotting.*
