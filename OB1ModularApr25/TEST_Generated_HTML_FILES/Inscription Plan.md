# Ordinal Inscription Plan: OB1 Audional Art Project

This document outlines the sequential plan for inscribing the project files onto the blockchain as Ordinals. The order is **critical** due to file dependencies. Each file that references another (via JS `import` or HTML `src`/`href`) must only be inscribed *after* the referenced file has been inscribed and its unique Ordinal ID is known.

---

## Step 1: Inscribe Base Modules & CSS (Group 1)

These files form the foundation and have no internal project dependencies.

*   **Pre-requisites:**
    *   None. These are the first files to be inscribed. Ordinal IDs are now pasted next to each 
*   **Files to Inscribe:**
    *   `utils.js` - 6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0
    *   `uiUpdater.js` - 943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0
    *   `midiHandler.js` - 0f41339bffd53a3a48ce7d08c786e8764ac091afc21d8b640ef03aae0aeed3c9i0
    *   `imageAnimation.js` - 934cf04352b9a33a362848a4fd148388f5a3997578fbdfaabd116a8f2932f7b5i0
    *   `timingManagement.js` - de1f95cbea6670453fcfeda0921f55fe111bd6b455f405d26dbdfedc2355f048i0
    *   `referenceDisplay.js` - 0753fec2800a46bd1e06ad3f2bdd3d35a5febeb2976d607c64a8d9326ab74e5fi0
    *   `style.css` - c93b6ee76c49aa33132dd3394bf6fe7b73b413c2d872945c1c6db53415c8e04bi0
*   **Action:**
    *   Inscribe each of the files listed above.
*   **Post-Inscription Task:**
    *   **`❗ Crucial:`** Securely record the unique **Ordinal ID** for *each* file inscribed in this step. These IDs are required for subsequent steps.

---

## Step 2: Inscribe Modules Depending on Group 1 (Group 2)

These files depend *only* on modules inscribed in Step 1.

*   **Pre-requisites:**
    *   You **must** have the Ordinal IDs for all files from **Step 1**.
*   **Files Requiring Update (Before Inscription):**
    *   `controlsColumn.js`: Update `import` for `utils.js` with its Step 1 Ordinal ID.
    *   `midiRecorder.js`: Update `import` for `utils.js` with its Step 1 Ordinal ID.
    *   `audioProcessor.js`: Update `import` statements for:
        *   `utils.js` (Step 1 ID)
        *   `uiUpdater.js` (Step 1 ID)
        *   `imageAnimation.js` (Step 1 ID)
        *   `timingManagement.js` (Step 1 ID)
*   **Files to Inscribe (After Updating):**
    *   `controlsColumn.js` - 3e32adf217d579d2bb799eb5d887da79a2f0107f1b7d2ad2f7b50528e3c25289i0
    *   `midiRecorder.js` - e9c3f4bb40fdb85218c94964f1c92bc76293b1ac5bfb92d88ace78a807d9e445i0
    *   `audioProcessor.js` - 086f00286fa2c0afc4bf66b9853ccf5bcf0a5f79d517f7e7a0d62150459b50e1i0
*   **Action:**
    *   **`⚠️ Important:`** Modify the files listed under "Files Requiring Update" to replace relative paths in `import` statements with their corresponding `/content/<OrdinalID>` paths obtained in Step 1.
    *   Inscribe the updated files.
*   **Post-Inscription Task:**
    *   **`❗ Crucial:`** Securely record the unique **Ordinal ID** for *each* file inscribed in this step.

---

## Step 3: Inscribe Modules Depending on Groups 1 & 2 (Group 3)

These files depend on modules from both Step 1 and Step 2.

*   **Pre-requisites:**
    *   You **must** have the Ordinal IDs for all files from **Step 1** and **Step 2**.
*   **Files Requiring Update (Before Inscription):**
    *   `layoutBuilder.js`: Update `import` statements for:
        *   `utils.js` (Step 1 ID)
        *   `controlsColumn.js` (Step 2 ID)
    *   `keyboardShortcuts.js`: Update `import` statements for:
        *   `audioProcessor.js` (Step 2 ID)
        *   `uiUpdater.js` (Step 1 ID)
        *   `utils.js` (Step 1 ID)
*   **Files to Inscribe (After Updating):**
    *   `layoutBuilder.js` - f713eefbacf125e64793b9925d7210cf18d0dd823f1c91b636d146a0d0a1854di0
    *   `keyboardShortcuts.js` - 665bc1893dea0d8a83d029f120902c2b4fb242b582b44e6f14703c49ec4978f1i0
*   **Action:**
    *   **`⚠️ Important:`** Modify the files listed under "Files Requiring Update" to replace relative paths in `import` statements with their corresponding `/content/<OrdinalID>` paths obtained in Steps 1 & 2.
    *   Inscribe the updated files.
*   **Post-Inscription Task:**
    *   **`❗ Crucial:`** Securely record the unique **Ordinal ID** for *each* file inscribed in this step.

---

## Step 4: Inscribe Core Application Logic (Group 4)

These are the main JavaScript entry points referenced by the HTML. They depend on modules from all previous steps.

*   **Pre-requisites:**
    *   You **must** have the Ordinal IDs for all files from **Step 1**, **Step 2**, and **Step 3**.
*   **Files Requiring Update (Before Inscription):**
    *   `app.js`: Update `import` for `layoutBuilder.js` (Step 3 ID).
    *   `main.js`: Update `import` statements for:
        *   `audioProcessor.js` (Step 2 ID)
        *   `uiUpdater.js` (Step 1 ID)
        *   `midiHandler.js` (Step 1 ID)
        *   `keyboardShortcuts.js` (Step 3 ID)
        *   `referenceDisplay.js` (Step 1 ID)
        *   `utils.js` (Step 1 ID)
        *   `midiRecorder.js` (Step 2 ID)
*   **Files to Inscribe (After Updating):**
    *   `app.js` - e0974fc427a7c54c864ad3c3b2ffbd0fef3c17049c15f3187b58257d628dbc70i0
    <!-- *   `main.js` - 9006eeb50fd9e8f7e00ff4ce1862b02c0711ea0b8d6aa1d3e1abca98a2338624i0 -->
    <!-- A new main.js has been created to handle touch controls on mobile devices -->
    *   `main.js` - 9f3a2017003dafeca94621a8b66bc2f0eb7b481c939c7ac50194a0b7685d54cei0

*   **Action:**
    *   **`⚠️ Important:`** Modify the files listed under "Files Requiring Update" to replace relative paths in `import` statements with their corresponding `/content/<OrdinalID>` paths obtained in Steps 1, 2, & 3.
    *   Inscribe the updated files.
*   **Post-Inscription Task:**
    *   **`❗ Crucial:`** Securely record the unique **Ordinal ID** for *each* file inscribed in this step.

---

## Step 5: Inscribe the HTML File (Group 5)

This is the final step, inscribing the main HTML file that ties everything together.

*   **Pre-requisites:**
    *   You **must** have the Ordinal IDs for:
        *   `style.css` (from **Step 1**)
        *   `app.js` (from **Step 4**)
        *   `main.js` (from **Step 4**)
*   **File Requiring Update (Before Inscription):**
    *   `abbreviatedIndex.html`:
        *   Modify the `<link rel="stylesheet" href="...">` tag. Change the `href` attribute to `/content/<OrdinalID_of_style.css>`.
        *   Modify the `<script type="module" src="app.js">` tag. Change the `src` attribute to `/content/<OrdinalID_of_app.js>`.
        *   Modify the `<script type="module" src="main.js">` tag. Change the `src` attribute to `/content/<OrdinalID_of_main.js>`.
*   **File to Inscribe (After Updating):**
    *   `abbreviatedIndex.html`
*   **Action:**
    *   **`⚠️ Important:`** Modify `abbreviatedIndex.html` as described above, replacing relative paths with the final `/content/<OrdinalID>` paths.
    *   Inscribe the updated `abbreviatedIndex.html`.
*   **Post-Inscription Task:**
    *   The inscription process is now complete! The Ordinal ID of `abbreviatedIndex.html` serves as the entry point to your fully on-chain application.

---

By following these steps precisely, you ensure that all internal references within your project point to the correct on-chain Ordinal IDs, resulting in a functional, self-contained application.