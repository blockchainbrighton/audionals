// IframeManager.js
  import { preloadContent, loadContentFromURL } from './ContentLoader.js';

  const numberOfIframes = 36; // Define the total number of iframes
  let activeIframeId = null; // Keeps track of the currently active iframe ID

  export function createIframes() {
    const container = document.querySelector('.grid-container');

    for (let i = 0; i < numberOfIframes; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'iframe-wrapper';
        wrapper.style.position = 'relative'; // Ensure this is set to position the borders absolutely

        // Create an iframe element
        const iframe = document.createElement('iframe');
        iframe.id = `iframe-${i}`;
        iframe.style.zIndex = '1'; // Ensure the iframe content is above the overlay


        // Create a transparent div to capture clicks on the iframe
        const clickCatcher = document.createElement('div');
        clickCatcher.className = 'click-catcher';
        clickCatcher.style.position = 'absolute';
        clickCatcher.style.top = '0';
        clickCatcher.style.right = '0';
        clickCatcher.style.bottom = '0';
        clickCatcher.style.left = '0';
        clickCatcher.style.zIndex = '2'; // Above the iframe but below the load button
        clickCatcher.style.pointerEvents = 'auto'; // Set to auto to capture click events

        // Add a click event listener to the clickCatcher
        clickCatcher.addEventListener('click', function() {
          // Log the ID of the clicked iframe
          console.log('Clicked iframe ID:', iframe.id);

          // Update the active iframe ID
          setActiveIframe(iframe.id);
          
          // Temporarily disable click capturing to let the click through to the iframe
          this.style.pointerEvents = 'none';
          
          // Use a timeout to re-enable the click capturing
          setTimeout(() => {
            this.style.pointerEvents = 'auto';
          }, 0);
        });


        // Append the clickCatcher to the wrapper
        wrapper.appendChild(clickCatcher);
        // Function to create a border div
        function createBorder(className) {
            const border = document.createElement('div');
            border.className = className;
            return border;
        }

        // Create and append the border divs
        const borderTop = createBorder('border-top');
        const borderRight = createBorder('border-right');
        const borderBottom = createBorder('border-bottom');
        const borderLeft = createBorder('border-left');

        wrapper.appendChild(borderTop);
        wrapper.appendChild(borderRight);
        wrapper.appendChild(borderBottom);
        wrapper.appendChild(borderLeft);
        wrapper.appendChild(iframe);

        // Create and append the load button
        const loadButton = document.createElement('button');
        loadButton.textContent = 'Load';
        loadButton.className = 'load-button';
        loadButton.style.zIndex = '2'; // Ensure the button is above the overlay
        loadButton.onclick = () => loadContentFromURL(iframe, loadButton);
        wrapper.appendChild(loadButton);

        container.appendChild(wrapper);
    }
    preloadContent(); // Preload content after creating iframes
    
    // Highlight the first iframe as selected
    const firstIframe = document.getElementById('iframe-0');
    if (firstIframe) {
        firstIframe.classList.add('selected-iframe');
    }
}

// Function to set the active iframe
  function setActiveIframe(iframeId) {
    // Remove 'selected-iframe' class from all iframes
    document.querySelectorAll('.iframe-wrapper iframe').forEach(iframe => {
      iframe.classList.remove('selected-iframe');
    });

    // Add 'selected-iframe' class to the active iframe
    const activeIframe = document.getElementById(iframeId);
    if (activeIframe) {
      activeIframe.classList.add('selected-iframe');
      activeIframeId = iframeId; // Update the active iframe ID
    }
  } 


// Clears the content of a single iframe
  export function clearIframe(iframe, loadButton) {
    iframe.src = 'about:blank';
    loadButton.style.display = 'block';
    loadButton.textContent = 'Load';
  }

  // Clears all iframes
  export function clearAllIframes() {
    document.querySelectorAll('.iframe-wrapper').forEach(wrapper => {
      const iframe = wrapper.querySelector('iframe');
      const loadButton = wrapper.querySelector('.load-button');
      clearIframe(iframe, loadButton);
    });
  }
    