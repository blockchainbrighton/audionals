// IframeManager.js
import { preloadContent, loadContentFromURL } from './ContentLoader.js';

const numberOfIframes = 36; // Define the total number of iframes
const eagerIframeRenderCount = 1; // Keep startup light; create remaining iframes on demand.

// Array to keep track of selected iframes
export const selectedIframeWrappers = [];


// Toggles the selected class on a single iframe wrapper
function toggleWrapperSelection(wrapper) {
  // Check if the iframe is already selected
  const isSelected = wrapper.classList.contains('selected-iframe');
  // Toggle the 'selected-iframe' class for the clicked wrapper
  wrapper.classList.toggle('selected-iframe');
  // Update the array of selected iframes
  if (isSelected) {
    // Remove from the array
    const index = selectedIframeWrappers.indexOf(wrapper);
    if (index > -1) {
      selectedIframeWrappers.splice(index, 1);
    }
  } else {
    // Add to the array
    selectedIframeWrappers.push(wrapper);
  }
}


function createWrapper(i) {
  const wrapper = document.createElement('div');
  wrapper.className = 'iframe-wrapper';
  wrapper.dataset.iframeIndex = String(i);
  wrapper.style.position = 'relative';

  // Add event listener to the wrapper to toggle the selected class
  wrapper.addEventListener('click', () => {
      toggleWrapperSelection(wrapper); // Toggle selection for this wrapper
  });

  return wrapper;
}

function createIframeElement(i) {
    const iframe = document.createElement('iframe');
    iframe.id = `iframe-${i}`;
    iframe.loading = 'lazy';
    iframe.style.zIndex = '1'; // Ensure the iframe content is above the overlay
    return iframe;
}

function ensureIframeInWrapper(wrapper, i) {
    let iframe = wrapper.querySelector('iframe');
    if (!iframe) {
      iframe = createIframeElement(i);
      const loadButton = wrapper.querySelector('.load-button');
      wrapper.insertBefore(iframe, loadButton || null);
    } else if (!iframe.id) {
      iframe.id = `iframe-${i}`;
    }
    return iframe;
}

function createLoadButton(wrapper, i) {
    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load';
    loadButton.className = 'load-button';
    loadButton.style.zIndex = '2'; // Ensure the button is above the overlay
    loadButton.onclick = () => {
      const iframe = ensureIframeInWrapper(wrapper, i);
      loadContentFromURL(iframe, loadButton);
    };
    // loadButton.classList.add('hidden');

    return loadButton;
}

function deselectAllIframes() {
    document.querySelectorAll('.iframe-wrapper').forEach(wrapper => {
        wrapper.classList.remove('selected-iframe');
    });
}

export function createIframes() {

    const container = document.querySelector('.grid-container');
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < numberOfIframes; i++) {
        const wrapper = createWrapper(i);
        if (i < eagerIframeRenderCount) {
          wrapper.appendChild(createIframeElement(i));
        }
        const loadButton = createLoadButton(wrapper, i);

        wrapper.appendChild(loadButton);
        fragment.appendChild(wrapper);
    }
    container.appendChild(fragment);
    console.log("[IframeManager] DEBUG All iframes created. Initial settings:", window.iframeSettings);

    preloadContent(); // Preload content after creating iframes
}


// Clears the content of a single iframe
  export function clearIframe(iframe, loadButton) {
    iframe.src = 'about:blank';
    loadButton.style.display = 'block';
    loadButton.textContent = 'Load';
  }

 // Clears all iframes and deselects them
  export function clearAllIframes() {
    document.querySelectorAll('.iframe-wrapper').forEach(wrapper => {
        const iframe = wrapper.querySelector('iframe');
        const loadButton = wrapper.querySelector('.load-button');
        if (iframe && loadButton) {
          clearIframe(iframe, loadButton);
        }
        wrapper.classList.remove('selected-iframe'); // Deselect the iframe
    });
  } 



// Function to get the IDs of the selected iframe wrappers
function getSelectedIframes() {
  return selectedIframeWrappers
    .map(wrapper => wrapper.querySelector('iframe')?.id)
    .filter(Boolean);
}


// Function to post a message to selected iframes based on the message type and data
export function postMessageToSelectedIframes(type, data) {
  console.log(`[postMessageToSelectedIframes] Posting message to selected iframes: type=${type}, data=`, data);
  const selectedIframesIds = getSelectedIframes(); // Get the IDs of the selected iframes

  // Post message only to selected iframes
  selectedIframesIds.forEach(id => {
      const iframe = document.getElementById(id);
      if (iframe) {
          const origin = new URL(iframe.src).origin; // Get the origin of the iframe
          iframe.contentWindow.postMessage({ type, data }, origin); // Replace '*' with the actual origin
      }
  });
}
