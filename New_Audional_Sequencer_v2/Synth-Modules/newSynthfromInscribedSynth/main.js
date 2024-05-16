// main.js

import './audioContext.js';
import './midiHandler.js';
import './arpeggiator.js';
import './uiHandler.js';
import './saveLoadHandler.js';

document.addEventListener('DOMContentLoaded', () => {
  const openEffectsModuleButton = document.getElementById('openEffectsModule');
  const effectsModuleContainer = document.getElementById('effectsModuleContainer');
  const closeEffectsModuleButton = document.getElementById('closeEffectsModule');
  const effectsModuleIframe = document.getElementById('effectsModuleIframe');

  openEffectsModuleButton.addEventListener('click', () => {
    if (effectsModuleContainer.style.display === 'none') {
      effectsModuleContainer.style.display = 'block';
    } else {
      effectsModuleContainer.style.display = 'none';
    }
  });

  closeEffectsModuleButton.addEventListener('click', () => {
    effectsModuleContainer.style.display = 'none';
  });

  // Make the container draggable
  dragElement(effectsModuleContainer);

  // Listen for messages from the iframe to dynamically adjust its size
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) {
      return;
    }
    if (event.data.type === 'resize') {
      const { width, height } = event.data;
      console.log(`Received resize message: width=${width}, height=${height}`);
      effectsModuleIframe.style.width = `${width}px`;
      effectsModuleIframe.style.height = `${height}px`;
    }
  });

  function dragElement(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
});
