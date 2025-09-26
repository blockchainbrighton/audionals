/**
 * Volume Settings Script
 * Allows users to adjust the volume and playback speed of each channel in the Unified Sequencer.
 */

/*===========================================
  Global Variables
===========================================*/
// let modalTimeout;     // Inactivity timeout for modal interaction
// let mouseOutTimeout;  // Timeout for mouse-out events on modal

/*===========================================
  Initialization & Event Listeners
===========================================*/
document.addEventListener("DOMContentLoaded", () => {
    const volumeButtons = document.querySelectorAll('.volume-button');
    const speedButtons = document.querySelectorAll('.playback-speed-button');

    volumeButtons.forEach((button, index) => {
        button.addEventListener('click', (event) => handleButtonClick(event, 'volume', index));
    });

    speedButtons.forEach((button, index) => {
        button.addEventListener('click', (event) => handleButtonClick(event, 'speed', index));
    });

    // Close modals if a click occurs outside of them
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.volume-modal')) closeModal('volume');
        if (!event.target.closest('.speed-modal')) closeModal('speed');
    });
});

/*===========================================
  Modal Management Functions
===========================================*/

/**
 * Handles the click event for volume/speed buttons.
 */
function handleButtonClick(event, type, index) {
    console.log(`${capitalize(type)} button clicked, toggling ${type} slider modal for channel:`, index);
    event.stopPropagation();
    toggleModal(event.currentTarget, type, index);
}

/**
 * Toggles the modal: if already open, it will close it; otherwise, it opens a new modal.
 */
function toggleModal(button, type, channelIndex) {
    const existingModal = document.querySelector(`.${type}-modal[data-channel="${channelIndex}"]`);
    if (existingModal) {
        closeModal(type);
    } else {
        openModal(button, type, channelIndex);
    }
}

/**
 * Opens a modal for a given button, type, and channel index.
 */
function openModal(button, type, channelIndex) {
    // Ensure only one modal of the same type is open at a time.
    closeModal(type);

    const modal = document.createElement('div');
    modal.classList.add(`${type}-modal`);
    modal.dataset.channel = channelIndex;
    modal.style.position = 'absolute';
    modal.style.left = `${button.offsetLeft + button.offsetWidth + 10}px`;
    modal.style.top = `${button.offsetTop}px`;
    modal.style.zIndex = 1000;
    modal.style.backgroundColor = '#fff';
    modal.style.border = '1px solid #ccc';
    modal.style.padding = '10px';
    modal.style.borderRadius = '5px';

    // Create a header for the modal with channel and control type information
    const modalHeader = document.createElement('div');
    modalHeader.classList.add('modal-header');
    // Retrieve the channel name, or default to "Channel {n}" if not set.
    const channelName = window.unifiedSequencerSettings.settings.masterSettings.projectChannelNames[channelIndex] || `Channel ${channelIndex + 1}`;
    // Capitalize the control type (e.g., "Volume" or "Speed")
    if (type === 'speed') {
        // Change this line to your desired text
        modalHeader.textContent = `${channelName} - Pitch Control`;
    } else {
        modalHeader.textContent = `${channelName} - ${capitalize(type)} Control`;
    }
    modalHeader.style.fontWeight = 'bold';
    modalHeader.style.marginBottom = '10px';
    modal.appendChild(modalHeader);

    // Create and append the close button.
    const closeButton = createCloseButton(() => closeModal(type));
    modal.appendChild(closeButton);

    // Create and append the slider and text input.
    const slider = createSlider(type, channelIndex);
    const textInput = createTextInput(type, channelIndex, slider);
    modal.appendChild(slider);
    modal.appendChild(textInput);

    addModalEventListeners(modal, type);

    document.body.appendChild(modal);
    // Auto-close timers removed so modal persists until manually closed.
}

/**
 * Closes all open modals of a given type.
 */
function closeModal(type) {
    document.querySelectorAll(`.${type}-modal`).forEach(modal => modal.remove());
}

// /**
//  * Resets the inactivity timeout for the modal.
//  */
// function resetModalTimeout(type) {
//     clearTimeout(modalTimeout);
//     modalTimeout = setTimeout(() => closeModal(type), 20000); // 20-second timeout
// }

// /**
//  * Sets a shorter timeout when the mouse leaves the modal.
//  */
// function setMouseOutTimeout(type) {
//     clearTimeout(mouseOutTimeout);
//     mouseOutTimeout = setTimeout(() => closeModal(type), 10000); // 10-second timeout
// }

/**
 * Adds event listeners to the modal to handle user interaction.
 */
function addModalEventListeners(modal, type) {
    modal.addEventListener('click', (event) => {
        event.stopPropagation();
        // resetModalTimeout(type);
    });

    // modal.addEventListener('mouseover', () => resetModalTimeout(type));
    // modal.addEventListener('mouseout', () => setMouseOutTimeout(type));
}

/*===========================================
  UI Component Creation Functions
===========================================*/

/**
 * Creates a close button for the modal.
 */
function createCloseButton(closeFunc) {
    const closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '5px';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.cursor = 'pointer';
    closeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        closeFunc();
    });
    return closeButton;
}

/**
 * Creates a slider input element for volume or speed.
 */
function createSlider(type, channelIndex) {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.classList.add('nice-slider');  // Apply new NiceSlider styling

    if (type === 'volume') {
        slider.min = 0;
        slider.max = 2;
        slider.step = 0.01;
    } else if (type === 'speed') {
        slider.min = 0.1;
        slider.max = 10;
        slider.step = 0.01;
    }
    
    slider.value = getChannelValue(type, channelIndex).toString();

    slider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        const textInput = slider.nextElementSibling;
        textInput.value = value.toString();
        setChannelValue(type, channelIndex, value);
        // resetModalTimeout(type);
    });
    return slider;
}

/**
 * Creates a number input element that mirrors the slider's value.
 */
function createTextInput(type, channelIndex, slider) {
    const textInput = document.createElement('input');
    textInput.type = 'number';
    textInput.classList.add('lcd-display');  // Apply lcd-display styling

    if (type === 'volume') {
        textInput.min = 0;
        textInput.max = 2;
        textInput.step = 0.01;
    } else if (type === 'speed') {
        textInput.min = 0.1;
        textInput.max = 10;
        textInput.step = 0.01;
    }
    
    textInput.value = slider.value;

    textInput.addEventListener('input', (event) => {
        let value = parseFloat(event.target.value);
        if (isNaN(value)) value = type === 'volume' ? 0 : 0.1;
        if (type === 'volume' && value > 2) value = 2;
        if (type === 'speed' && value > 10) value = 10;
        slider.value = value.toString();
        setChannelValue(type, channelIndex, value);
        // resetModalTimeout(type);
    });
    return textInput;
}

/*===========================================
  Channel Value Management Functions
===========================================*/

/**
 * Retrieves the current value for the given channel and type.
 */
function getChannelValue(type, channelIndex) {
    if (type === 'volume') {
        const gainNode = window.unifiedSequencerSettings.gainNodes[channelIndex];
        return gainNode ? gainNode.gain.value : 1.0;
    } else if (type === 'speed') {
        return window.unifiedSequencerSettings.channelPlaybackSpeed[channelIndex] || 1.0;
    }
}

/**
 * Sets the channel value based on type (volume or speed).
 */
function setChannelValue(type, channelIndex, value) {
    if (type === 'volume') {
        setChannelVolume(channelIndex, value);
    } else if (type === 'speed') {
        setChannelSpeed(channelIndex, value);
    }
}

/**
 * Updates the channel's volume and persists the setting.
 */
function setChannelVolume(channelIndex, volume) {
    console.log(`Setting volume for channel ${channelIndex} to ${volume}`);
    const audioContext = window.unifiedSequencerSettings.audioContext;
    const gainNode = window.unifiedSequencerSettings.gainNodes[channelIndex];

    if (!gainNode) {
        console.error(`No gain node found for channel ${channelIndex}`);
        return;
    }

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);

    if (!window.unifiedSequencerSettings.settings.masterSettings.channelVolume) {
        window.unifiedSequencerSettings.settings.masterSettings.channelVolume = new Array(32).fill(1);
    }
    window.unifiedSequencerSettings.settings.masterSettings.channelVolume[channelIndex] = volume;
    localStorage.setItem(`channelVolume_${channelIndex}`, volume.toString());
}

/**
 * Updates the channel's playback speed.
 */
function setChannelSpeed(channelIndex, speed) {
    console.log(`Setting playback speed for channel ${channelIndex} to ${speed}`);
    window.unifiedSequencerSettings.setChannelPlaybackSpeed(channelIndex, speed);
}

/*===========================================
  Utility Functions
===========================================*/

/**
 * Capitalizes the first letter of the given string.
 */
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}