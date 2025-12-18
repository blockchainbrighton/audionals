# Project Context: Oscilloscope App

## Project Overview
This project is a web-based **Oscilloscope Application** (v15.6) designed to visualize audio signals. It utilizes the **Web Audio API** (specifically AudioWorklet) for high-performance audio processing and **Web Components** for the UI structure.

The application is self-contained, with the primary entry point being `index-b.html` and the core logic bundled into a single JavaScript file, `bundle.js`.

### Key Technologies
*   **HTML5:** Structure and metadata.
*   **JavaScript (ES6+):** Core logic, Web Components (Custom Elements), and Web Audio API.
*   **Web Audio API:** specific usage of `AudioWorklet` for processing.
*   **Terser:** Used for JavaScript minification.

## Directory Structure
*   `index-b.html`: The main HTML entry point for the application.
*   `bundle.js`: Contains all the JavaScript logic, including the `<osc-app>` component definition and audio processing code.
*   `package.json`: Defines the project metadata and scripts (primarily for minification).

## Building and Running

### Running the Application
Since this is a client-side web application, you can run it by serving the directory with a local web server.

```bash
# Example using python (if available)
python3 -m http.server

# Example using npx and http-server
npx http-server .
```

Once the server is running, navigate to `http://localhost:8000/index-b.html` (or the port provided by your server).

### Building (Minification)
The project includes a script to minify the `bundle.js` file.

**Note:** The `minify` script overwrites `bundle.js`. Ensure you have a backup if `bundle.js` is your primary source.

```bash
# Install dependencies
npm install

# Run the minification script
npm run minify
```

## Development Conventions

*   **Single Bundle:** The project appears to have consolidated multiple source files (referenced as `setup.js` and modules in comments) into a single `bundle.js`. Modifying code likely involves editing `bundle.js` directly unless original sources are recovered.
*   **Web Components:** The UI is built using custom elements (e.g., `class ... extends HTMLElement`). Look for `customElements.define` calls to find component registrations.
*   **Audio Processing:** Heavy use of the Web Audio API. Logic related to audio analysis and rendering is likely found within the `bundle.js`.
