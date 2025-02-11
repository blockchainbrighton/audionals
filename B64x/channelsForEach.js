import { setupLoadSampleButton } from './loadSampleModalButton_v2.js';

console.log("channelsForEach.js entered");

/**
 * ChannelModule encapsulates all the channel-related functionality including:
 * - Group assignment (button & dropdown)
 * - Mute / Solo toggle logic
 * - Clear (reset) functionality
 * - Group filtering
 * - Custom context menu for preset group names
 */
const ChannelModule = (function () {
  // Internal state arrays and channel storage
  let channelsStore = [];
  let soloedChannels = [];
  let mutedChannels = [];

  /**
   * Initialize all channels.
   * @param {NodeList|Array} channels - List of channel elements.
   */
  function init(channels) {
    channelsStore = Array.from(channels);
    channelsStore.forEach((channel, index) => {
      // Initialize state
      soloedChannels[index] = false;
      mutedChannels[index] = false;

      // Assign a unique id and set up the sample button
      channel.dataset.id = `Channel-${index}`;
      setupLoadSampleButton(channel, index);

      // Set up individual channel controls
      initGroupControls(channel, index);
      initMuteControl(channel, index);
      initSoloControl(channel, index);
      initClearControl(channel, index);
    });

    // Set up global group filtering
    initGroupFilter();
  }

  /**
   * Sets up group button and dropdown events for assigning a channel to a group.
   */
  function initGroupControls(channel, index) {
    const groupButton = channel.querySelector('.group-button');
    const groupDropdown = channel.querySelector('.group-dropdown');
    if (!groupButton || !groupDropdown) return;

    // Hide dropdown by default
    groupDropdown.style.display = "none";

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
      if (groupDropdown.selectedIndex <= 0) return;
      showPresetContextMenu(event, groupDropdown, index);
    });

    // Hide the dropdown if clicking outside the channel element.
    document.addEventListener('click', (event) => {
      if (!channel.contains(event.target)) {
        groupDropdown.style.display = "none";
      }
    });
  }

  /**
   * Set up the mute button event.
   */
  function initMuteControl(channel, index) {
    const muteButton = channel.querySelector('.mute-button');
    if (!muteButton) return;

    muteButton.addEventListener('click', () => {
      console.log(`Mute button clicked for Channel-${index}`);
      mutedChannels[index] = !mutedChannels[index];
      muteButton.classList.toggle('selected', mutedChannels[index]);
      updateAllChannelMuteStates();
    });
  }

  /**
   * Set up the solo button event.
   */
  function initSoloControl(channel, index) {
    const soloButton = channel.querySelector('.solo-button');
    if (!soloButton) return;

    soloButton.addEventListener('click', () => {
      soloedChannels[index] = !soloedChannels[index];
      soloButton.classList.toggle('selected', soloedChannels[index]);
      updateAllChannelMuteStates();
    });
  }

  /**
   * Set up the clear button event for resetting the channel's steps.
   */
  function initClearControl(channel, index) {
    const clearButton = channel.querySelector('.clear-button');
    if (!clearButton) return;
    let clearConfirmTimeout = null;

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

    // If the user clicks elsewhere, cancel the clear confirmation.
    document.addEventListener('click', (e) => {
      if (!clearButton.contains(e.target) && clearButton.classList.contains('flashing')) {
        clearTimeout(clearConfirmTimeout);
        clearButton.classList.remove('flashing');
      }
    });
  }

  /**
   * Initialize the group filter control.
   */
  function initGroupFilter() {
    const groupFilter = document.getElementById('group-filter');
    if (!groupFilter) return;
    groupFilter.addEventListener('change', (event) => {
      const selectedGroup = event.target.value; // "all" or a specific group value
      channelsStore.forEach((channel) => {
        const channelGroup = channel.dataset.group || "";
        channel.style.display =
          selectedGroup === "all" || channelGroup === selectedGroup ? "" : "none";
      });
    });
    groupFilter.addEventListener('contextmenu', (event) => {
      console.log("[group-filter contextmenu] Event fired.");
      event.preventDefault();
      // Additional context menu logic for the filter can be added here if needed.
    });
  }

  /**
   * Displays a custom context menu for preset group names.
   * @param {MouseEvent} event - The contextmenu event.
   * @param {HTMLSelectElement} dropdown - The dropdown element that was right-clicked.
   * @param {number} channelIndex - The index of the channel.
   */
  function showPresetContextMenu(event, dropdown, channelIndex) {
    // Remove any existing custom context menu.
    const existingMenu = document.getElementById('custom-context-menu');
    if (existingMenu) {
      existingMenu.parentNode.removeChild(existingMenu);
    }

    const menu = document.createElement('div');
    menu.id = 'custom-context-menu';
    Object.assign(menu.style, {
      position: 'absolute',
      top: event.clientY + 'px',
      left: event.clientX + 'px',
      backgroundColor: '#fff',
      border: '1px solid #ccc',
      zIndex: 1000,
      padding: '5px',
      boxShadow: '2px 2px 6px rgba(0,0,0,0.2)'
    });

    const presetGroupNames = [
      "Drums",
      "Vocals",
      "Soundtrack",
      "Bass",
      "Guitar",
      "Synth",
      "Percussion"
    ];

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
          console.log(
            `Channel ${channelIndex} group updated: ${oldText} -> ${presetName}`
          );
        }
        if (menu.parentNode) {
          menu.parentNode.removeChild(menu);
        }
      });
      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // Remove the custom menu if the user clicks outside it.
    const removeMenu = (e) => {
      if (!menu.contains(e.target)) {
        if (menu.parentNode) menu.parentNode.removeChild(menu);
        document.removeEventListener('click', removeMenu);
      }
    };
    document.addEventListener('click', removeMenu);
  }

  /**
   * Clears the steps for the channel.
   * @param {HTMLElement} channel - The channel element.
   * @param {number} channelIndex - The index of the channel.
   */
  function clearSteps(channel, channelIndex) {
    const currentSequence = window.unifiedSequencerSettings.getCurrentSequence();
    const sequenceKey = `Sequence${currentSequence}`;
    const channelKey = `ch${channelIndex}`;
    const numSteps =
      window.unifiedSequencerSettings.settings.masterSettings.projectSequences[sequenceKey][
        channelKey
      ].steps.length;
    const newStepStates = Array(numSteps).fill(false);

    for (let i = 0; i < numSteps; i++) {
      window.unifiedSequencerSettings.updateStepStateAndReverse(
        currentSequence,
        channelIndex,
        i,
        newStepStates[i],
        false
      );
    }

    const stepButtons = channel.querySelectorAll('.step-button');
    stepButtons.forEach((button, stepIndex) => {
      updateButtonState(button, currentSequence, channelIndex, stepIndex);
    });
  }

  /**
   * Updates the visual state of a step button.
   */
  function updateButtonState(button, sequence, channelIndex, stepIndex) {
    const { isActive, isReverse } =
      window.unifiedSequencerSettings.getStepStateAndReverse(sequence, channelIndex, stepIndex);
    button.classList.toggle('selected', isActive);
    button.classList.toggle('reverse-playback', isReverse);
    button.style.backgroundColor = '';
    if (isActive) {
      button.style.backgroundColor = 'red';
    }
    if (isReverse) {
      button.style.backgroundColor = 'green';
    }
  }

  /**
   * Recalculates and updates the effective mute state for all channels.
   * If any channel is soloed, only soloed channels will remain unmuted.
   */
  function updateAllChannelMuteStates() {
    const anySoloed = soloedChannels.some((val) => val);
    channelsStore.forEach((channel, i) => {
      const effectiveMute = anySoloed ? !soloedChannels[i] : mutedChannels[i];
      const storeVolume = anySoloed ? false : true;
      window.AudioUtilsPart2.updateMuteState(channel, effectiveMute, storeVolume);
    });
  }

  // Public API
  return {
    init,
    updateAllChannelMuteStates,
  };
})();

// Initialize the channel module.
// (Assumes that `channels` is defined globally as a NodeList or array of channel elements.)
ChannelModule.init(channels);