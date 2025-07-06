Certainly! Here’s a concise, clear README for your **HTML Snapshot API** system. This README is designed for other developers or on-chain programs that want to request and retrieve a Base64-encoded PNG image snapshot of any HTML program by Ordinal ID.

---

# HTML Snapshot API – Ordinal Still Image Capture

This project provides a simple interface and API for capturing a still image (PNG, Base64-encoded) of any HTML program identified by an Ordinal ID. This enables other on-chain programs or web services (same domain) to request and use a rendered snapshot of an inscribed HTML file.

---

## How It Works

1. **Input**:

   * The user (or an automated program) enters an Ordinal ID in the provided text box.
   * The page fetches the HTML content at `/content/{ORDINAL_ID}` and loads it into a sandboxed `<iframe>`.

2. **Snapshot Generation**:

   * When the “Capture Base64” button is clicked, the app takes a snapshot of the currently loaded HTML in the `<iframe>`.
   * The result is a Base64-encoded PNG image representing exactly what is rendered in the iframe.

3. **Output**:

   * The Base64 PNG is displayed in a `<textarea>` for copy-paste or programmatic retrieval.
   * This output can be used by other applications for embedding, on-chain proofs, or further processing.

---

## User Interface

* **Input Box**: Enter or paste any Ordinal ID (the unique identifier of an inscribed HTML file).
* **Go Button**: Fetches and loads the HTML content from `/content/{ORDINAL_ID}` into an iframe for rendering.
* **Capture Base64 Button**: Captures the current visual rendering as a PNG, encodes it in Base64, and outputs it for easy reuse.

---

## API Usage

To integrate or automate requests for still images, follow these steps:

### 1. Load the Target HTML

* Provide an Ordinal ID string (e.g., `09e0b0c4...i0`) to the input.
* Click or trigger the “Go” button programmatically to load the HTML.

### 2. Capture the Snapshot

* Use the global function `window.getSnapshotBase64(callback)` to retrieve a Base64 image of the current view:

  ```js
  window.getSnapshotBase64(function(base64png){
    // Do something with base64png
    // Example: display in an <img>, send to another API, save to disk, etc.
  });
  ```
* **Note:** This function captures the exact visual content of the loaded HTML as seen in the iframe.

### 3. Programmatic Example

To use this as an API in another program on the same domain:

```js
// 1. Set the Ordinal ID in the input box:
document.getElementById('u').value = 'YOUR_ORDINAL_ID';
// 2. Trigger the load:
p();
// 3. Wait for load, then capture snapshot:
setTimeout(() => {
  window.getSnapshotBase64(base64 => {
    // Use your Base64 image here
    console.log(base64);
  });
}, 2000); // Adjust timeout as needed for load
```

---

## Security & Domain Limitations

* **Same Domain**: This system works for Ordinal content served from the same domain, as required by browser security restrictions.
* **No External Libraries**: Pure vanilla JS, suitable for on-chain use, no external dependencies.

---

## Use Cases

* **On-chain thumbnailing** of HTML programs.
* Generating **proof-of-view** for Ordinal-inscribed HTML.
* Creating **visual previews** for explorers, marketplaces, or automation tools.

---

## FAQ

**Q: Does it work with any HTML file?**
A: Yes, as long as the content can be loaded into the iframe and rendered within the browser’s security model.

**Q: Can I automate snapshot capture?**
A: Yes, just call `window.getSnapshotBase64(callback)` after loading the content.

**Q: What is the output?**
A: A PNG image encoded as a Base64 data URL.

---

## Example

**Load and snapshot Ordinal ID `09e0b0c471a6a89c1385c67016e5e6a97f6a6df38207c2d79da67cadf0774368i0`:**

* Enter the ID, click "Go", then click "Capture Base64".
* The resulting PNG Base64 string appears in the textarea.

---

## License

MIT – Do as you wish.

---

**For questions or integration help, submit an issue or contact the author.**

---

Let me know if you want an even more developer-focused section, sample scripts, or FAQ expansion!
