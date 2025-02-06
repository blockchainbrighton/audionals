// channelsForeach.js

import { setupLoadSampleButton } from './loadSampleModalButton_v2.js';

console.log("channelsForEach.js entered");

channels.forEach((channel, index) => {
  // Assign a unique id to each channel and perform any setup work
  channel.dataset.id = `Channel-${index}`;
  setupLoadSampleButton(channel, index);

  // Group button & dropdown logic
  // Use class selectors so that each channel’s elements are targeted
  const groupButton = channel.querySelector('.group-button');
  const groupDropdown = channel.querySelector('.group-dropdown');

  // Ensure the dropdown is hidden initially
  groupDropdown.style.display = "none";

  if (groupButton && groupDropdown) {
    // When the group button is clicked, always show the dropdown immediately.
    groupButton.addEventListener('click', (event) => {
      event.stopPropagation();
      groupDropdown.style.display = "block";
    });

    // When a group is selected (via left-click), log the selection, update state, and hide the dropdown.
    groupDropdown.addEventListener('change', (event) => {
      const selectedGroup = event.target.value;
      console.log(`Channel ${index} assigned to group: ${selectedGroup}`);
      // Optionally, update the channel’s state (e.g., via a data attribute):
      channel.dataset.group = selectedGroup;
      groupDropdown.style.display = "none";
    });

    // Right-click (contextmenu) on the group dropdown to show a list of preset generic names.
    groupDropdown.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      // Only show the context menu if a valid group option is selected.
      const selectedIndex = groupDropdown.selectedIndex;
      if (selectedIndex <= 0) {
        // If nothing or the placeholder is selected, do nothing.
        return;
      }
      showPresetContextMenu(event, groupDropdown, index);
    });

    // Hide the dropdown if the user clicks anywhere outside of the current channel element.
    document.addEventListener('click', (event) => {
      if (!channel.contains(event.target)) {
        groupDropdown.style.display = "none";
      }
    });
  }

  // --- Mute button event ---
  const muteButton = channel.querySelector('.mute-button');
  muteButton.addEventListener('click', () => {
    console.log(`Mute button clicked for Channel-${index}`);
    const isMuted = muteButton.classList.toggle('selected');
    updateMuteState(channel, isMuted);
  });

  // --- Solo button event ---
  const soloButton = channel.querySelector('.solo-button');
  soloButton.addEventListener('click', () => {
    soloedChannels[index] = !soloedChannels[index];
    soloButton.classList.toggle('selected', soloedChannels[index]);
    channels.forEach((otherChannel, otherIndex) => {
      if (index === otherIndex) {
        updateMuteState(otherChannel, false);
      } else {
        updateMuteState(otherChannel, soloedChannels[index]);
      }
    });
  });

  // --- Clear button event ---
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

// (If you still need group filtering using a separate <select id="group-filter">, keep or update that code.)
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
  // Remove any existing custom context menu
  const existingMenu = document.getElementById('custom-context-menu');
  if (existingMenu) {
    existingMenu.parentNode.removeChild(existingMenu);
  }

  // Create a new menu container
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

  // Hardcoded preset names
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
      // Update the text of the currently selected option in the dropdown.
      const selectedIndex = dropdown.selectedIndex;
      if (selectedIndex > 0) {
        const currentOption = dropdown.options[selectedIndex];
        const oldText = currentOption.text;
        currentOption.text = presetName;
        console.log(`Channel ${channelIndex} group updated: ${oldText} -> ${presetName}`);
      }
      // Remove the context menu after selection.
      if (menu.parentNode) {
        menu.parentNode.removeChild(menu);
      }
    });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  // Remove the context menu if the user clicks outside of it.
  const removeMenu = (e) => {
    if (!menu.contains(e.target)) {
      if (menu.parentNode) menu.parentNode.removeChild(menu);
      document.removeEventListener('click', removeMenu);
    }
  };
  document.addEventListener('click', removeMenu);
}
