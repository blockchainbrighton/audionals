// channelSettings.js


function setChannelVolume(channelIndex, volume) {
  const channel = document.querySelector(`.channel[data-id="Channel-${channelIndex + 1}"]`);
  channel.dataset.volume = volume;
  updateChannelVolume(channel);

  // Update sequence data
  updateSequenceData({
      channelIndex: channelIndex,
      volume: volume
  });

  saveCurrentSequence(currentSequence);
}

  function updateChannelVolume(channel) {
    const volume = parseFloat(channel.dataset.volume);
    const gainNode = gainNodes[parseInt(channel.dataset.id.split('-')[1]) - 1];
    gainNode.gain.value = volume;
    }

// Function to toggle the dropdown menu
function toggleDropdownMenu(event) {
  // Prevent the default action to avoid any unwanted behavior
  event.preventDefault();

  // Find the dropdown content related to the clicked arrow
  const dropdownContent = event.target.closest('.channel-dropdown').querySelector('.channel-dropdown-content');
  
  // Check if the dropdown content is found
  if (dropdownContent) {
    // Toggle the display property
    dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
  } else {
    // If the dropdown content is not found, log an error message
    console.error('Dropdown content not found');
  }
}

// Event listener for the dropdown arrow
document.addEventListener('click', function(event) {
  // Check if the clicked element is the dropdown arrow or any of its children
  if (event.target.matches('.channel-dropdown-arrow') || event.target.closest('.channel-dropdown-arrow')) {
    toggleDropdownMenu(event);
  } else {
    // If the click is outside the dropdown, close any open dropdown menus
    const dropdowns = document.querySelectorAll('.channel-dropdown-content');
    dropdowns.forEach(function(dropdown) {
      if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
      }
    });
  }
}, true); // Use capturing to ensure this runs before the arrow's click event

// Event listener for the trim audio option
document.addEventListener('click', function(event) {
  if (event.target.matches('.trim-audio-option')) {
    openTrimModule();
    // Hide the dropdown menu after selection
    event.target.closest('.channel-dropdown-content').style.display = 'none';
  }
}, true);
