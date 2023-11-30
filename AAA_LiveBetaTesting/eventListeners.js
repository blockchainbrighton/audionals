
// eventListeners.js

document.addEventListener("DOMContentLoaded", function() {
    let saveFileInput = document.getElementById('save-file-input');
    let loadFileInput = document.getElementById('load-file-input');
    let loadButton = document.getElementById('load-button');
    let loadOptions = document.getElementById('loadOptions');
    let loadJson = document.getElementById('loadJson');
    let loadInternalPreset = document.getElementById('loadInternalPreset');
    let loadInternalPreset2 = document.getElementById('loadInternalPreset2');
    let loadInternalPreset3 = document.getElementById('loadInternalPreset3');
    let loadInternalPreset4 = document.getElementById('loadInternalPreset4');
    let loadInternalPreset5 = document.getElementById('loadInternalPreset5');



    saveButton.addEventListener('click', () => {
      let { settings, filename } = exportSettings();
  
      // Create a Blob with the settings
      let blob = new Blob([settings], { type: 'application/json' });
  
      // Create a download link for the Blob
      let url = URL.createObjectURL(blob);
      let downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
  
      // Trigger a click on the download link
      downloadLink.click();
    });
    
  
  
    loadButton.addEventListener('click', () => {
        if (loadOptions.style.display === "none" || loadOptions.style.display === "") {
            loadOptions.style.display = "block";
        } else {
            loadOptions.style.display = "none";
        }
    });
  
    loadJson.addEventListener('click', () => {
        loadFileInput.click();
        loadOptions.style.display = "none"; // Hide the menu after selection
    });

    function loadPresetFromFile(filePath) {
        console.log(`Loading preset from: ${filePath}`);
        fetch(filePath)
            .then(response => response.json())
            .then(data => {
                console.log(`Loaded data from ${filePath}`, data);
                const jsonString = JSON.stringify(data);
                importSettings(jsonString); // Existing call to importSettings
                packageSettingsForGlobalObject(jsonString); // New call to packageSettingsForGlobalObject
            })
            .catch(error => {
                console.error(`Error loading preset from ${filePath}:`, error);
            });
    
        loadOptions.style.display = "none"; // Hide the menu after selection
    }
    
    // Attaching the function to buttons
    loadInternalPreset.addEventListener('click', () => loadPresetFromFile('Preset_Json_Files/internalPreset1.json'));
    loadInternalPreset2.addEventListener('click', () => loadPresetFromFile('Preset_Json_Files/randomOrdinalSounds2.json'));
    loadInternalPreset3.addEventListener('click', () => loadPresetFromFile('Preset_Json_Files/Japanese_Koto_Samples.json'));
    loadInternalPreset4.addEventListener('click', () => loadPresetFromFile('Preset_Json_Files/internalPreset4.json'));
    loadInternalPreset5.addEventListener('click', () => loadPresetFromFile('Preset_Json_Files/Koto2.json'));



    
  
  loadFileInput.addEventListener('change', () => {
      let file = loadFileInput.files[0];
      let reader = new FileReader();
      reader.onload = function(e) {
          let settings = e.target.result;
          importSettings(settings);
          console.log("Loaded file content:", settings);

      };
      reader.readAsText(file);
  });
});

  // Listen for messages
  window.addEventListener('message', function(event) {
    // If a 'load' command is received, load the song
    if (event.data.command === 'load') {
        fetch(event.data.path)
            .then(response => response.json())
            .then(song => loadSong(song));
    }
    // If a 'play' command is received, start the sequencer
    else if (event.data.command === 'play') {
        startScheduler();
    }
    // If a 'stop' command is received, stop the sequencer
    else if (event.data.command === 'stop') {
        stopScheduler();
    }
    // If a 'pause' command is received, pause the sequencer
    else if (event.data.command === 'pause') {
        pauseScheduler();
    }
});



document.querySelectorAll('.open-audio-trimmer').forEach(button => {
    button.addEventListener('click', function(event) {
        console.log('[eventListeners.js] {button click handler} - Open audio trimmer button clicked');

        const channelElement = event.target.closest('.channel');
        if (!channelElement) {
            return console.error('[eventListeners.js] {button click handler} - Channel element not found');
        }
        console.log('[eventListeners.js] {button click handler} - Channel element dataset:', channelElement.dataset);

        const channelIndex = parseInt(channelElement.id.split('-')[1]) - 1;
        if (isNaN(channelIndex)) {
            return console.error('[eventListeners.js] {button click handler} - Invalid channel index');
        }
        console.log('[eventListeners.js] {button click handler} - Channel Index:', channelIndex);

        const originalUrl = channelElement.dataset.originalUrl;
        if (!originalUrl) {
            return console.error('[eventListeners.js] {button click handler} - Original URL not found on the channel element');
        }
        console.log('[eventListeners.js] {button click handler} - Original URL:', originalUrl);

        const savedTrimSettings = window.unifiedSequencerSettings.getTrimSettings(channelIndex);
        console.log('[eventListeners.js] {button click handler} - Retrieved trim settings for channel:', channelIndex, savedTrimSettings);

        window.audioTrimmerData = {
            originalUrl: originalUrl,
            channelIndex: channelIndex,
            trimSettings: savedTrimSettings
        };
        console.log('[eventListeners.js] {button click handler} - Data passed to Audio Trimmer component:', window.audioTrimmerData);

        const modal = document.getElementById('audio-trimmer-modal');
        if (!modal) {
            return console.error('[eventListeners.js] {button click handler} - Modal element not found');
        }
        modal.style.display = 'block';
        console.log('[eventListeners.js] {button click handler} - Modal displayed');

        // const trimmerContainer = document.getElementById('audio-trimmer-container');
        // trimmerContainer.innerHTML = '';
        // console.log('[eventListeners.js] {button click handler} - Trimmer container cleared');
    });
});



// Close the modal when the user clicks on <span> (x)
document.querySelector('.close-button').addEventListener('click', function() {
    console.log('Close button clicked');
    document.getElementById('audio-trimmer-modal').style.display = 'none';
    console.log('Modal closed');
});

// Close the modal when the user clicks anywhere outside of the modal
window.onclick = function(event) {
    const modal = document.getElementById('audio-trimmer-modal');
    if (event.target === modal) {
        console.log('Clicked outside the modal');
        modal.style.display = 'none';
        console.log('Modal closed');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const projectNameInput = document.getElementById('project-name');

    projectNameInput.addEventListener('input', () => {
        const projectName = projectNameInput.value;
        window.unifiedSequencerSettings.updateSetting('projectName', projectName);
    });
});