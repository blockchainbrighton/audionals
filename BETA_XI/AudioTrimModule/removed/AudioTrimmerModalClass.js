class AudioTrimmerModal extends HTMLElement {
    constructor() {
      super();
      // Attach a shadow DOM for encapsulation.
      const shadow = this.attachShadow({ mode: 'open' });
  
      // Define the component’s template.
      shadow.innerHTML = `
        <style>
          /* Add component-specific styles here or link to an external stylesheet */
          .trimmer-modal-content {
            /* your styles */
          }
          .close-button {
            cursor: pointer;
          }
        </style>
        <div class="trimmer-modal-content">
          <span class="close-button">&times;</span>
          <div id="audio-trimmer-container">
            <!-- The audio trimmer UI will be instantiated here -->
          </div>
        </div>
      `;
    }
  
    connectedCallback() {
      // Attach event listener for the close button.
      this.shadowRoot.querySelector('.close-button').addEventListener('click', () => {
        this.style.display = 'none';
        // Optionally, you can also clean up or reset the trimmer instance here.
      });
    }
  }
  
  // Register the custom element.
  customElements.define('audio-trimmer-modal', AudioTrimmerModal);