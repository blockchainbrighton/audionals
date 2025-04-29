document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const MAX_AUDIO_SECONDS = 30;
    const UPLOAD_ENDPOINT = '/upload'; // Replace with your actual server endpoint

    // --- DOM Elements ---
    const uploadForm = document.getElementById('uploadForm');
    // File Section
    const audioFileInput = document.getElementById('audioFile');
    const fileInfoDiv = document.getElementById('fileInfo');
    const fileErrorDiv = document.getElementById('fileError');
    const audioPreview = document.getElementById('audioPreview');
    // Metadata Section
    const creatorNameInput = document.getElementById('creatorName');
    const creatorNameErrorDiv = document.getElementById('creatorNameError');
    const sampleNameInput = document.getElementById('sampleName');
    const sampleNameErrorDiv = document.getElementById('sampleNameError');
    const audioTypeSelect = document.getElementById('audioType');
    const audioSubTypeSelect = document.getElementById('audioSubType');
    const audioTypeErrorDiv = document.getElementById('audioTypeError');
    const instrumentTypeSelect = document.getElementById('instrumentType');
    const instrumentSubTypeSelect = document.getElementById('instrumentSubType');
    const sampleFormatRadios = document.querySelectorAll('input[name="sampleFormat"]');
    const formatOneShotRadio = document.getElementById('formatOneShot');
    const formatLoopRadio = document.getElementById('formatLoop');
    const sampleFormatErrorDiv = document.getElementById('sampleFormatError');
    const loopDetailsDiv = document.getElementById('loopDetails');
    const bpmInput = document.getElementById('bpm');
    const bpmErrorDiv = document.getElementById('bpmError');
    const loopLengthInput = document.getElementById('loopLength');
    const loopLengthErrorDiv = document.getElementById('loopLengthError');
    const musicalKeyInput = document.getElementById('musicalKey');
    const specificNoteInput = document.getElementById('specificNote');
    const tagsInput = document.getElementById('tags');
    const rightsCheckbox = document.getElementById('rightsConfirmation');
    const rightsErrorDiv = document.getElementById('rightsError');
    // Submission Section
    const submitButton = document.getElementById('submitButton');
    const formMessageDiv = document.getElementById('formMessage');

    // --- State Variables ---
    let isFileValid = false;
    let isMetadataValid = false;
    let currentFile = null;
    let currentObjectUrl = null; // To manage audio preview URL

    // --- Data for Cascading Dropdowns ---
    const audioSubTypes = {
        music: ["Melody", "Harmony", "Rhythm", "Bassline", "Chord Progression", "Arpeggio", "Full Mix Element"],
        sfx: ["Foley", "Impact", "Whoosh", "UI Sound", "Ambient Noise", "Vehicle", "Animal"],
        vocal: ["Lead Vocal", "Backing Vocal", "Ad-lib", "Spoken Word", "Vocal Chop", "Chant"],
        ambient: ["Pad", "Drone", "Texture", "Field Recording"],
        other: ["Glitch", "Experimental", "Silence"] // Keep 'Other' simple or add specifics
    };

    const instrumentSubTypes = {
        drums_percussion: ["Kick", "Snare", "Hi-Hat (Closed)", "Hi-Hat (Open)", "Cymbal (Crash)", "Cymbal (Ride)", "Tom", "Clap", "Rimshot", "Shaker", "Tambourine", "Conga", "Bongo", "Cowbell", "Electronic Drum"],
        synth: ["Synth Lead", "Synth Pad", "Synth Bass", "Synth Arp", "Synth FX", "Modular Synth"],
        keyboard: ["Piano (Acoustic)", "Piano (Electric)", "Organ", "Harpsichord", "Celesta", "Clavinet"],
        guitar_bass: ["Guitar (Acoustic)", "Guitar (Electric Clean)", "Guitar (Electric Distorted)", "Bass (Electric)", "Bass (Acoustic)", "Bass (Synth)"],
        strings: ["Violin", "Viola", "Cello", "Double Bass", "Harp", "String Ensemble"],
        wind: ["Flute", "Clarinet", "Oboe", "Bassoon", "Saxophone", "Trumpet", "Trombone", "Tuba", "Harmonica"],
        world: ["Sitar", "Tabla", "Didgeridoo", "Kalimba", "Steel Drum", "Bagpipes"],
        orchestral: ["Timpani", "Glockenspiel", "Xylophone", "Marimba", "Tubular Bells"],
        // 'none' and 'other' typically don't need sub-types
    };

    // --- Functions ---

    /**
     * Populates a secondary select dropdown based on the primary selection.
     * @param {HTMLSelectElement} primarySelect - The primary dropdown element.
     * @param {HTMLSelectElement} secondarySelect - The secondary dropdown element to populate.
     * @param {object} dataMap - The object mapping primary values to arrays of secondary options.
     * @param {string} defaultSecondaryText - The placeholder text for the secondary select.
     */
    function populateSecondarySelect(primarySelect, secondarySelect, dataMap, defaultSecondaryText) {
        const selectedValue = primarySelect.value;
        const subOptions = dataMap[selectedValue] || [];

        // Clear existing options
        secondarySelect.innerHTML = `<option value="">${defaultSecondaryText}</option>`;

        if (subOptions.length > 0) {
            subOptions.forEach(optionText => {
                const option = document.createElement('option');
                option.value = optionText.toLowerCase().replace(/\s+/g, '_'); // Create a value (e.g., hi_hat_closed)
                option.textContent = optionText;
                secondarySelect.appendChild(option);
            });
            secondarySelect.disabled = false;
        } else {
            secondarySelect.disabled = true;
        }
    }

    /**
     * Validates a specific input field and displays an error message.
     * @param {HTMLElement} input - The input element (input, select, etc.).
     * @param {HTMLElement} errorDiv - The div to display the error message.
     * @param {string} errorMessage - The message to display if invalid.
     * @param {function} validationFn - A function that returns true if the input is valid.
     * @returns {boolean} - True if valid, false otherwise.
     */
     function validateField(input, errorDiv, errorMessage, validationFn) {
        if (validationFn(input)) {
            errorDiv.textContent = '';
            return true;
        } else {
            errorDiv.textContent = errorMessage;
            return false;
        }
    }

    /**
     * Validates the entire form state and enables/disables the submit button.
     */
    function validateForm() {
        let isLoopFormatSelected = formatLoopRadio.checked;

        // --- Perform individual field validations ---
        const isCreatorNameValid = validateField(creatorNameInput, creatorNameErrorDiv, 'Creator name is required.', input => input.value.trim() !== '');
        const isSampleNameValid = validateField(sampleNameInput, sampleNameErrorDiv, 'Sample name is required.', input => input.value.trim() !== '');
        const isAudioTypeValid = validateField(audioTypeSelect, audioTypeErrorDiv, 'Audio type is required.', input => input.value !== '');
        const isSampleFormatValid = validateField(document.querySelector('input[name="sampleFormat"]:checked'), // Check if *any* radio is checked
                                              sampleFormatErrorDiv, 'Sample format (Loop or One-Shot) is required.', input => input !== null);

        let isBpmValid = true;
        let isLoopLengthValid = true;
        if (isLoopFormatSelected) {
            isBpmValid = validateField(bpmInput, bpmErrorDiv, 'BPM is required for loops.', input => input.value.trim() !== '' && !isNaN(parseFloat(input.value)) && parseFloat(input.value) > 0);
            isLoopLengthValid = validateField(loopLengthInput, loopLengthErrorDiv, 'Loop length (bars) is required for loops.', input => input.value.trim() !== '' && !isNaN(parseInt(input.value)) && parseInt(input.value) > 0);
        } else {
            // Clear loop errors if not applicable
            bpmErrorDiv.textContent = '';
            loopLengthErrorDiv.textContent = '';
        }

        const isRightsConfirmed = validateField(rightsCheckbox, rightsErrorDiv, 'You must confirm ownership rights.', input => input.checked);

        // --- Determine overall metadata validity ---
        // Required fields: Creator Name, Sample Name, Audio Type, Sample Format, Rights Confirmation
        // Conditional required fields: BPM, Loop Length (if Loop selected)
        isMetadataValid = isCreatorNameValid &&
                          isSampleNameValid &&
                          isAudioTypeValid &&
                          isSampleFormatValid &&
                          isRightsConfirmed &&
                          (!isLoopFormatSelected || (isBpmValid && isLoopLengthValid)); // Loop fields only required if loop selected


        // --- Enable/disable submit button ---
        submitButton.disabled = !(isFileValid && isMetadataValid);
    }


    /**
     * Resets the file input section UI.
     */
    function resetFileInputUI() {
        fileInfoDiv.textContent = '';
        fileErrorDiv.textContent = '';
        audioPreview.style.display = 'none';
        audioPreview.removeAttribute('src');
        audioFileInput.value = ''; // Clear the file input visually
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl); // Clean up previous URL
            currentObjectUrl = null;
        }
        isFileValid = false; // Reset file validity state
    }

    /**
     * Resets the metadata section to its default state.
     */
    function resetMetadataUI() {
        // Reset dropdowns and conditional fields
        populateSecondarySelect(audioTypeSelect, audioSubTypeSelect, audioSubTypes, '-- Select Primary Type First --');
        populateSecondarySelect(instrumentTypeSelect, instrumentSubTypeSelect, instrumentSubTypes, '-- Select Instrument Type First --');
        loopDetailsDiv.classList.remove('visible');
        bpmInput.value = ''; // Clear conditional fields
        loopLengthInput.value = '';
        // Clear all metadata errors
        creatorNameErrorDiv.textContent = '';
        sampleNameErrorDiv.textContent = '';
        audioTypeErrorDiv.textContent = '';
        sampleFormatErrorDiv.textContent = '';
        bpmErrorDiv.textContent = '';
        loopLengthErrorDiv.textContent = '';
        rightsErrorDiv.textContent = '';
        // Reset metadata validity state
        isMetadataValid = false;
    }


    /**
     * Displays messages in the main form message area.
     * @param {string} message - The message text.
     * @param {'success' | 'error'} type - The message type.
     */
    function displayFormMessage(message, type) {
        formMessageDiv.textContent = message;
        formMessageDiv.className = `message-area ${type}`; // Add type class
    }

    /**
     * Clears the main form message area.
     */
    function clearFormMessage() {
        formMessageDiv.textContent = '';
        formMessageDiv.className = 'message-area'; // Reset class
    }

    // --- Event Listeners ---

    // File Input Change
    audioFileInput.addEventListener('change', (event) => {
        resetFileInputUI();
        clearFormMessage();
        isFileValid = false;
        currentFile = event.target.files[0];

        if (!currentFile) {
            validateForm(); // Update button state
            return;
        }

        // 1. Validate File Type
        if (currentFile.type !== 'audio/wav' && !currentFile.name.toLowerCase().endsWith('.wav')) {
            fileErrorDiv.textContent = 'Invalid file type. Please upload a .wav file.';
            currentFile = null;
            audioFileInput.value = ''; // Clear visually
            validateForm();
            return;
        }

        // 2. Validate Audio Duration
        const audio = new Audio();
        currentObjectUrl = URL.createObjectURL(currentFile);

        audio.addEventListener('loadedmetadata', () => {
            const duration = audio.duration;

            if (isNaN(duration) || duration === Infinity) {
                 // Handle cases where duration can't be determined (corrupt file?)
                 console.error('Could not determine audio duration.');
                 fileErrorDiv.textContent = 'Could not determine audio duration. File might be corrupt.';
                 isFileValid = false;
                 audioFileInput.value = '';
                 currentFile = null;
                 URL.revokeObjectURL(currentObjectUrl);
                 currentObjectUrl = null;
            } else if (duration > MAX_AUDIO_SECONDS) {
                fileErrorDiv.textContent = `Audio duration exceeds ${MAX_AUDIO_SECONDS} seconds (Duration: ${duration.toFixed(2)}s).`;
                isFileValid = false;
                audioFileInput.value = '';
                currentFile = null;
                URL.revokeObjectURL(currentObjectUrl);
                currentObjectUrl = null;
            } else {
                fileInfoDiv.textContent = `File: ${currentFile.name} (Duration: ${duration.toFixed(2)}s)`;
                isFileValid = true;
                audioPreview.src = currentObjectUrl;
                audioPreview.style.display = 'block';
            }
            validateForm();
        });

        audio.addEventListener('error', (e) => {
            console.error('Error loading audio metadata:', e);
            fileErrorDiv.textContent = 'Could not read audio file. Check file integrity.';
            isFileValid = false;
            audioFileInput.value = '';
            currentFile = null;
            if (currentObjectUrl) {
                 URL.revokeObjectURL(currentObjectUrl);
                 currentObjectUrl = null;
            }
            validateForm();
        });

        audio.src = currentObjectUrl;
        // Validate form partly - button likely disabled until metadata loaded
        validateForm();
    });

    // Metadata Field Listeners (for real-time validation)
    creatorNameInput.addEventListener('input', validateForm);
    sampleNameInput.addEventListener('input', validateForm);
    rightsCheckbox.addEventListener('change', validateForm);
    bpmInput.addEventListener('input', validateForm); // Validate loop fields on input
    loopLengthInput.addEventListener('input', validateForm);

    // Cascading Dropdown: Audio Type -> SubType
    audioTypeSelect.addEventListener('change', () => {
        populateSecondarySelect(audioTypeSelect, audioSubTypeSelect, audioSubTypes, '-- Select Sub-Type --');
        validateForm(); // Re-validate after change
    });

    // Cascading Dropdown: Instrument Type -> SubType
    instrumentTypeSelect.addEventListener('change', () => {
         populateSecondarySelect(instrumentTypeSelect, instrumentSubTypeSelect, instrumentSubTypes, '-- Select Specific Instrument --');
         validateForm(); // Instrument type isn't required, but validate anyway
    });

    // Conditional Fields: Sample Format (Loop/One-Shot)
    sampleFormatRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (formatLoopRadio.checked) {
                loopDetailsDiv.classList.add('visible');
                // Optionally make BPM/Length required dynamically if needed
                // bpmInput.required = true;
                // loopLengthInput.required = true;
            } else {
                loopDetailsDiv.classList.remove('visible');
                 // Clear values and remove required status if set dynamically
                bpmInput.value = '';
                loopLengthInput.value = '';
                // bpmInput.required = false;
                // loopLengthInput.required = false;
                bpmErrorDiv.textContent = ''; // Clear potential errors
                loopLengthErrorDiv.textContent = '';
            }
            validateForm(); // Re-validate after showing/hiding fields
        });
    });


    // Form Submission
    uploadForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default browser submission
        validateForm(); // Perform final validation check

        if (!isFileValid || !isMetadataValid) {
            displayFormMessage('Please check the form for errors before submitting.', 'error');
            // Focus the first invalid field (basic example)
            const firstError = uploadForm.querySelector('.error-message:not(:empty)');
            if(firstError) {
                 const inputId = firstError.id.replace('Error', '');
                 const inputField = document.getElementById(inputId);
                 inputField?.focus();
            }
            return;
        }

        // Disable button and show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Uploading...';
        clearFormMessage();

        // --- Create FormData ---
        const formData = new FormData();
        // File
        formData.append('audioFile', currentFile);
        // Required Metadata
        formData.append('creatorName', creatorNameInput.value.trim());
        formData.append('sampleName', sampleNameInput.value.trim());
        formData.append('audioType', audioTypeSelect.value);
        formData.append('sampleFormat', document.querySelector('input[name="sampleFormat"]:checked').value);
        formData.append('rightsConfirmation', rightsCheckbox.checked.toString()); // Send as string 'true'/'false'

        // Optional/Conditional Metadata
        if (audioSubTypeSelect.value) {
            formData.append('audioSubType', audioSubTypeSelect.value);
        }
        if (instrumentTypeSelect.value) {
            formData.append('instrumentType', instrumentTypeSelect.value);
        }
        if (instrumentSubTypeSelect.value && !instrumentSubTypeSelect.disabled) {
            formData.append('instrumentSubType', instrumentSubTypeSelect.value);
        }
        if (formatLoopRadio.checked) {
            formData.append('bpm', bpmInput.value);
            formData.append('loopLengthBars', loopLengthInput.value); // Use a descriptive name
        }
        if (musicalKeyInput.value.trim()) {
            formData.append('musicalKey', musicalKeyInput.value.trim());
        }
        if (specificNoteInput.value.trim()) {
            formData.append('specificNote', specificNoteInput.value.trim());
        }
        if (tagsInput.value.trim()) {
            formData.append('tags', tagsInput.value.trim());
        }
        // Add calculated duration
        if (isFileValid && audioPreview.duration && isFinite(audioPreview.duration)) {
            formData.append('durationSeconds', audioPreview.duration.toFixed(3));
        }


        // --- Send data using Fetch API ---
        fetch(UPLOAD_ENDPOINT, {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                 return response.text().then(text => { // Get text for more detailed errors
                     throw new Error(`Server error: ${response.status} ${response.statusText}. ${text ? 'Details: ' + text : ''}`);
                 });
            }
            return response.json(); // Assuming server responds with JSON on success
        })
        .then(data => {
            console.log('Success:', data);
            displayFormMessage('Upload successful!', 'success');
            uploadForm.reset(); // Reset form fields to default values
            resetFileInputUI();   // Clear file UI elements & state
            resetMetadataUI();  // Clear metadata UI elements & state
            validateForm();     // Re-evaluate form state (will disable button)
        })
        .catch(error => {
            console.error('Upload error:', error);
            displayFormMessage(`Upload failed: ${error.message}`, 'error');
            // Don't reset the form on failure, allow user to fix and retry
            submitButton.disabled = false; // Re-enable button
        })
        .finally(() => {
            // Reset button text if it's still 'Uploading...'
             if (submitButton.textContent === 'Uploading...') {
               submitButton.textContent = 'Upload Sample';
            }
        });
    });

    // --- Initial Setup ---
    resetMetadataUI(); // Ensure dropdowns are in correct initial state
    validateForm(); // Initial validation check
});