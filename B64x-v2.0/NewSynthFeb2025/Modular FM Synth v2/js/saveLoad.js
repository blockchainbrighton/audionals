// js/saveLoad.js

/**
 * Saves the provided settings object as a JSON file and triggers a download.
 * @param {Object} settings - The synthesizer settings to save.
 */
export function saveSettings(settings) {
    const json = JSON.stringify(settings, null, 2); // Indented for readability
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'synth_settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  
  /**
   * Loads settings from a file and passes the parsed data to a callback.
   * @param {File} file - The JSON file to load.
   * @param {Function} callback - Function to handle the parsed settings.
   */
  export function loadSettings(file, callback) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const settings = JSON.parse(event.target.result);
        callback(settings);
      } catch (error) {
        console.error('Error parsing settings file:', error);
        alert('Invalid settings file.');
      }
    };
    reader.readAsText(file);
  }