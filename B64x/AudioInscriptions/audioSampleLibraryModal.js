// audioSampleLibraryModal.js
function openAudioSampleLibraryModal(onSampleSelected) {
    // Create the modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.classList.add('modal-overlay');
    Object.assign(modalOverlay.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    });
  
    // Create the modal content container
    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');
    Object.assign(modalContent.style, {
      background: '#fff',
      padding: '20px',
      borderRadius: '5px',
      width: '400px',
      maxHeight: '80vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });
  
    // Add a header/title
    const header = document.createElement('h2');
    header.textContent = 'Select a Sample';
    modalContent.appendChild(header);
  
    // Container for the sample list
    const sampleListContainer = document.createElement('div');
    sampleListContainer.id = 'audio-sample-list';
    sampleListContainer.style.flex = '1';
    modalContent.appendChild(sampleListContainer);
  
    // Add a Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.marginTop = '10px';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
    modalContent.appendChild(closeButton);
  
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
  
    // Fetch the JSON list of audio samples
    fetch('AudioInscriptions/all_audio_inscriptions.json')
    .then(response => response.json())
      .then(data => {
        // Clear any existing items
        sampleListContainer.innerHTML = '';
        // For each audio sample, create an entry with a Use button
        data.forEach((audio, index) => {
          const sampleDiv = document.createElement('div');
          sampleDiv.classList.add('audio-sample');
          sampleDiv.style.display = 'flex';
          sampleDiv.style.alignItems = 'center';
          sampleDiv.style.justifyContent = 'space-between';
          sampleDiv.style.borderBottom = '1px solid #ccc';
          sampleDiv.style.padding = '5px 0';
  
          // For now, just display the sample id (or more metadata if desired)
          const infoSpan = document.createElement('span');
          infoSpan.textContent = audio.id;
          sampleDiv.appendChild(infoSpan);
  
          // Create the "Use" button
          const useButton = document.createElement('button');
          useButton.textContent = 'Use';
          useButton.style.marginLeft = '10px';
          useButton.addEventListener('click', async () => {
            try {
              // Copy the sample's Ordinal ID to the clipboard
              await navigator.clipboard.writeText(audio.id);
              console.log(`Ordinal ID has been copied to the clipboard: ${audio.id}`);
  
              // Call the callback provided by the parent so it can update its input field
              if (typeof onSampleSelected === 'function') {
                onSampleSelected(audio.id);
              }
  
              // Optionally, close the modal after selection:
              document.body.removeChild(modalOverlay);
            } catch (err) {
              console.error('Failed to copy Ordinal ID:', err);
            }
          });
          sampleDiv.appendChild(useButton);
  
          sampleListContainer.appendChild(sampleDiv);
        });
      })
      .catch(error => {
        console.error('Error loading sample list:', error);
        sampleListContainer.textContent = 'Failed to load samples.';
      });
  }