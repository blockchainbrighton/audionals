
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
        console.log("Load button clicked");
        if (loadOptions.style.display === "none" || loadOptions.style.display === "") {
            console.log("Displaying load options");
            loadOptions.style.display = "block";
        } else {
            console.log("Hiding load options");
            loadOptions.style.display = "none";
        }
    });
    
    loadJson.addEventListener('click', () => {
        console.log("Load JSON option selected");
        loadFileInput.click();
        loadOptions.style.display = "none"; // Hide the menu after selection
    });
    
    loadInternalPreset.addEventListener('click', () => {
        console.log("Loading internal preset 1");
        fetch('Preset_Json_Files/internalPreset1.json')
            .then(response => {
                console.log("Received response for internal preset 1", response);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Loaded data for internal preset 1", data);
                importSettings(JSON.stringify(data));
            })
            .catch(error => {
                console.error("Error loading the internal preset 1:", error);
            });
    
        loadOptions.style.display = "none"; // Hide the menu after selection
    });
    
    loadInternalPreset2.addEventListener('click', () => {
        console.log("Loading internal preset 2");
        fetch('Preset_Json_Files/internalPreset2.json')
            .then(response => {
                console.log("Received response for internal preset 2", response);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Loaded data for internal preset 2", data);
                importSettings(JSON.stringify(data));
            })
            .catch(error => {
                console.error("Error loading the internal preset 2:", error);
            });
    
        loadOptions.style.display = "none"; // Hide the menu after selection
    });
    
    loadInternalPreset3.addEventListener('click', () => {
        console.log("Loading internal preset 3 (Japanese Koto Samples)");
        fetch('Preset_Json_Files/Japanese_Koto_Samples.json')
            .then(response => {
                console.log("Received response for Japanese Koto Samples", response);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Loaded data for Japanese Koto Samples", data);
                importSettings(JSON.stringify(data));
            })
            .catch(error => {
                console.error("Error loading the Japanese Koto Samples preset:", error);
            });
    
        loadOptions.style.display = "none"; // Hide the menu after selection
    });
    
    loadFileInput.addEventListener('change', () => {
        console.log("File input changed");
        let file = loadFileInput.files[0];
        console.log("Selected file:", file.name);
        let reader = new FileReader();
        reader.onload = function(e) {
            let settings = e.target.result;
            console.log("Loaded file content:", settings);
            importSettings(settings);
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
        console.log('Open audio trimmer button clicked');

        // Get the channel element
        const channelElement = event.target.closest('.channel');
        if (!channelElement) {
            return console.error('Channel element not found');
        }

        // Extract the ID from the originalUrl for the audio sample
        const originalUrl = channelElement.dataset.originalUrl;
        const ordinalId = originalUrl ? originalUrl.split('/').pop() : '';
        if (!ordinalId) {
            return console.error('Original URL not found on the channel element');
        }
        console.log('Ordinal ID:', ordinalId);

        // Use the ID of the channel element as the channel number
        const channelNumber = channelElement.id;
        if (!channelNumber) {
            return console.error('Channel number not found on the channel element');
        }
        console.log('Channel Number:', channelNumber);

        // Retrieve trim settings for the channel
        const savedTrimSettings = getTrimSettings(channelNumber);
        console.log('Retrieved trim settings for channel:', channelNumber, savedTrimSettings);

        // Display the modal
        const modal = document.getElementById('audio-trimmer-modal');
        if (!modal) {
            return console.error('Modal element not found');
        }
        modal.style.display = 'block';
        console.log('Modal displayed');

        // Clear previous Audio Trimmer instance and instantiate a new one
        const trimmerContainer = document.getElementById('audio-trimmer-container');
        trimmerContainer.innerHTML = ''; // Clear the container

        // Define default settings
        const defaultSettings = { start: 0.01, end: 100 };

        // Instantiate the Audio Trimmer with settings
        const audioTrimmer = new AudioTrimmer({
            target: trimmerContainer,
            props: {
                externalAudioContext: audioContext,
                externalOrdinalId: ordinalId,
                channelIndex: channelNumber,
                startSliderValue: savedTrimSettings?.start || defaultSettings.start,
                endSliderValue: savedTrimSettings?.end || defaultSettings.end
            }
        });

        // Log the collected values
        console.log('Audio trimmer instantiated with the following settings:', {
            externalAudioContext: audioContext,
            externalOrdinalId: ordinalId,
            channelIndex: channelNumber,
        });
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
