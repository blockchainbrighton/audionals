// channelsForeach.js

import { setupLoadSampleButton } from './loadSampleModalButton_v2.js';

console.log("channelsForEach.js entered");

// Initialize state arrays for each channel (assuming channels is a NodeList or array)
let soloedChannels = [];
let mutedChannels = [];
channels.forEach((channel, index) => {
  soloedChannels[index] = false;
  mutedChannels[index] = false;
});

channels.forEach((channel, index) => {
  // Assign a unique id to each channel and perform any setup work
  channel.dataset.id = `Channel-${index}`;
  setupLoadSampleButton(channel, index);

  // Group button & dropdown logic
  const groupButton = channel.querySelector('.group-button');
  const groupDropdown = channel.querySelector('.group-dropdown');
  groupDropdown.style.display = "none";

  if (groupButton && groupDropdown) {
    groupButton.addEventListener('click', (event) => {
      event.stopPropagation();
      groupDropdown.style.display = "block";
    });

    groupDropdown.addEventListener('change', (event) => {
      const selectedGroup = event.target.value;
      console.log(`Channel ${index} assigned to group: ${selectedGroup}`);
      channel.dataset.group = selectedGroup;
      groupDropdown.style.display = "none";
    });

    groupDropdown.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const selectedIndex = groupDropdown.selectedIndex;
      if (selectedIndex <= 0) return;
      showPresetContextMenu(event, groupDropdown, index);
    });

    document.addEventListener('click', (event) => {
      if (!channel.contains(event.target)) {
        groupDropdown.style.display = "none";
      }
    });
  }

  // --- Mute button event ---
// --- Mute button event ---
const muteButton = channel.querySelector('.mute-button');
  muteButton.addEventListener('click', () => {
    console.log(`Mute button clicked for Channel-${index}`);
    // Toggle the manual mute state in our array
    mutedChannels[index] = !mutedChannels[index];
    // Update the visual state of the mute button
    muteButton.classList.toggle('selected', mutedChannels[index]);
    // Recalculate the effective mute state for all channels using manual storage
    updateAllChannelMuteStates();
  });

// --- Solo button event ---
const soloButton = channel.querySelector('.solo-button');
  soloButton.addEventListener('click', () => {
    // Toggle the solo flag for this channel
    soloedChannels[index] = !soloedChannels[index];
    soloButton.classList.toggle('selected', soloedChannels[index]);
    // Recalculate the effective mute state for all channels (using storeVolume = false for solo override)
    updateAllChannelMuteStates();
  });

  // --- Clear button event (unchanged) ---
  const clearButton = channel.querySelector('.clear-button');
  let clearConfirmTimeout;
  clearButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!clearButton.classList.contains('flashing')) {
      clearButton.classList.add('flashing');
      clearConfirmTimeout = setTimeout(() => {
        clearButton.classList.remove('flashing');
      }, 2000);
    } else {
      clearSteps(channel, index);
    }
  });

  document.addEventListener('click', (e) => {
    if (!clearButton.contains(e.target) && clearButton.classList.contains('flashing')) {
      clearTimeout(clearConfirmTimeout);
      clearButton.classList.remove('flashing');
    }
  });

  function clearSteps(channel, channelIndex) {
    const currentSequence = window.unifiedSequencerSettings.getCurrentSequence();
    const numSteps = window.unifiedSequencerSettings.settings.masterSettings.projectSequences[`Sequence${currentSequence}`][`ch${channelIndex}`].steps.length;
    const newStepStates = Array(numSteps).fill(false);
    for (let i = 0; i < numSteps; i++) {
      window.unifiedSequencerSettings.updateStepStateAndReverse(currentSequence, channelIndex, i, newStepStates[i], false);
    }
    const stepButtons = channel.querySelectorAll('.step-button');
    stepButtons.forEach((button, stepIndex) => {
      updateButtonState(button, currentSequence, channelIndex, stepIndex);
    });
    clearTimeout(clearConfirmTimeout);
    clearButton.classList.remove('flashing');
  }

  function updateButtonState(button, sequence, channelIndex, stepIndex) {
    const { isActive, isReverse } = window.unifiedSequencerSettings.getStepStateAndReverse(sequence, channelIndex, stepIndex);
    button.classList.toggle('selected', isActive);
    button.classList.toggle('reverse-playback', isReverse);
    button.style.backgroundColor = '';
    if (isActive) button.style.backgroundColor = 'red';
    if (isReverse) button.style.backgroundColor = 'green';
  }
});

// Global document click listener for clear buttons (if needed)
document.addEventListener('click', () => {
  channels.forEach((channel, channelIndex) => {
    if (clearClickedOnce[channelIndex]) {
      const clearConfirm = channel.querySelector('.clear-confirm');
      clearConfirm.style.display = "none";
      clearTimeout(clearConfirmTimeout[channelIndex]);
      clearClickedOnce[channelIndex] = false;
    }
  });
});

// Group filtering code remains unchanged
document.getElementById('group-filter')?.addEventListener('change', function (event) {
  const selectedGroup = event.target.value; // "all" or a specific group value
  channels.forEach((channel) => {
    const channelGroup = channel.dataset.group || "";
    if (selectedGroup === "all" || channelGroup === selectedGroup) {
      channel.style.display = "";
    } else {
      channel.style.display = "none";
    }
  });
});

document.getElementById('group-filter')?.addEventListener('contextmenu', function (event) {
  console.log("[group-filter contextmenu] Event fired.");
  event.preventDefault();
  // ... (existing code for the filter select if needed)
});

/**
 * Creates and shows a custom context menu with hardcoded preset group names.
 * When an option is chosen, it updates the text of the currently selected option
 * in the dropdown.
 *
 * @param {MouseEvent} event - The contextmenu event.
 * @param {HTMLSelectElement} dropdown - The dropdown element that was right-clicked.
 * @param {number} channelIndex - The index of the channel (for logging).
 */
function showPresetContextMenu(event, dropdown, channelIndex) {
  const existingMenu = document.getElementById('custom-context-menu');
  if (existingMenu) {
    existingMenu.parentNode.removeChild(existingMenu);
  }

  const menu = document.createElement('div');
  menu.id = 'custom-context-menu';
  menu.style.position = 'absolute';
  menu.style.top = event.clientY + 'px';
  menu.style.left = event.clientX + 'px';
  menu.style.backgroundColor = '#fff';
  menu.style.border = '1px solid #ccc';
  menu.style.zIndex = 1000;
  menu.style.padding = '5px';
  menu.style.boxShadow = '2px 2px 6px rgba(0,0,0,0.2)';

  const presetGroupNames = ["Drums", "Vocals", "Soundtrack", "Bass", "Guitar", "Synth", "Percussion"];

  presetGroupNames.forEach((presetName) => {
    const item = document.createElement('div');
    item.textContent = presetName;
    item.style.padding = '5px';
    item.style.cursor = 'pointer';
    item.addEventListener('mouseover', () => {
      item.style.backgroundColor = '#eee';
    });
    item.addEventListener('mouseout', () => {
      item.style.backgroundColor = '#fff';
    });
    item.addEventListener('click', () => {
      const selectedIndex = dropdown.selectedIndex;
      if (selectedIndex > 0) {
        const currentOption = dropdown.options[selectedIndex];
        const oldText = currentOption.text;
        currentOption.text = presetName;
        console.log(`Channel ${channelIndex} group updated: ${oldText} -> ${presetName}`);
      }
      if (menu.parentNode) {
        menu.parentNode.removeChild(menu);
      }
    });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  const removeMenu = (e) => {
    if (!menu.contains(e.target)) {
      if (menu.parentNode) menu.parentNode.removeChild(menu);
      document.removeEventListener('click', removeMenu);
    }
  };
  document.addEventListener('click', removeMenu);
}

/**
 * Updates the effective mute state for all channels based on both solo and manual mute toggles.
 */
function updateAllChannelMuteStates() {
  // Check if any channel is soloed.
  const anySoloed = soloedChannels.some(val => val);
  channels.forEach((channel, i) => {
    let effectiveMute;
    if (anySoloed) {
      // In solo mode, a channel is unmuted only if it is soloed.
      effectiveMute = !soloedChannels[i];
    } else {
      // If no channel is soloed, use the manual mute state.
      effectiveMute = mutedChannels[i];
    }
    // When in solo mode, we do NOT store the volume (storeVolume = false).
    const storeVolume = anySoloed ? false : true;
    window.AudioUtilsPart2.updateMuteState(channel, effectiveMute, storeVolume);
  });
}