// floatingWindowUtils.js

function createFloatingWindow() {
    const floatingWindow = document.createElement('div');
    floatingWindow.className = 'floatingWindow';
    console.log("Creating floating window...");

    const titleBar = createTitleBar();
    console.log("Adding title bar...");
    floatingWindow.appendChild(titleBar);

    const closeButton = createCloseButton();
    console.log("Adding close button...");
    floatingWindow.appendChild(closeButton);

    console.log("Making window draggable...");
    makeFloatingWindowDraggable(floatingWindow);

    console.log("Floating window created:", floatingWindow);
    return floatingWindow;
}


function createCloseButton() {
    const closeButton = document.createElement('div');
    closeButton.textContent = 'X';
    closeButton.className = 'closeButton';
    closeButton.addEventListener('click', () => closeButton.closest('.floatingWindow').remove());

    return closeButton;
}

function makeFloatingWindowDraggable(floatingWindow) {
    let isDragging = false;
    const titleBar = floatingWindow.querySelector('.titleBar'); // Assuming there's a title bar for dragging

    if (!titleBar) {
        console.error("No title bar found for dragging. Please ensure there's a titleBar element.");
        return;
    }

    titleBar.onmousedown = function (event) {
        isDragging = true;
        const shiftX = event.clientX - floatingWindow.getBoundingClientRect().left;
        const shiftY = event.clientY - floatingWindow.getBoundingClientRect().top;

        function onMouseMove(event) {
            if (isDragging) {
                floatingWindow.style.left = `${event.pageX - shiftX}px`;
                floatingWindow.style.top = `${event.pageY - shiftY}px`;
            }
        }

        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    titleBar.ondragstart = () => false;
}

function createTitleBar() {
    const titleBar = document.createElement('div');
    titleBar.className = 'titleBar';
    titleBar.textContent = 'Drag Me'; // You can customize this text or style
    return titleBar;
}

function createTabbedInterface() {
    const floatingWindow = createFloatingWindow();
    const tabContainer = document.createElement('div');
    tabContainer.className = 'tabContainer';

    // Instead of one iframe, we use a container for multiple iframes.
    const iframeContainer = document.createElement('div');
    iframeContainer.style.width = '100%';
    iframeContainer.style.height = 'calc(100% - 40px)';
    iframeContainer.style.position = 'relative'; // Position iframes absolutely within

    floatingWindow.appendChild(tabContainer);
    floatingWindow.appendChild(iframeContainer);
    document.body.appendChild(floatingWindow);

    return { tabContainer, iframeContainer };
}

function addTab(tabContainer, iframeContainer, tabName, channelIndex, loadSampleButtonId) {
    const button = document.createElement('button');
    button.textContent = tabName + " - Channel " + channelIndex;  // Display tab name with channel index
    button.className = 'inactiveTab';  // Initially, mark the button as inactive

    // Create a new iframe or reuse existing one
    let iframe = iframeContainer.querySelector(`iframe[data-channel='${channelIndex}']`);
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.setAttribute('data-channel', channelIndex);
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.display = 'none';  // Start hidden
        iframe.src = `Synth-Modules/${tabName}/index.html?channelIndex=${channelIndex}`;
        iframeContainer.appendChild(iframe);
    }

    button.onclick = () => {
        const iframes = iframeContainer.querySelectorAll('iframe');
        const loadSampleButton = document.getElementById(loadSampleButtonId);  // Retrieve the button by ID

        // Hide all iframes
        iframes.forEach(iframe => iframe.style.display = 'none');
        // Show the selected tab's iframe
        iframe.style.display = 'block';

        // Update the Load Sample button text to reflect the loaded synth
        if (loadSampleButton) {
            loadSampleButton.textContent = tabName + " - Channel " + channelIndex;  // Set the button text
        }

        // Remove 'activeTab' class from all buttons and add 'inactiveTab' class
        const buttons = tabContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.classList.remove('activeTab');
            btn.classList.add('inactiveTab');
        });

        // Add 'activeTab' class to the clicked button and remove 'inactiveTab' class
        button.classList.add('activeTab');
        button.classList.remove('inactiveTab');
    };

    if (tabContainer.childNodes.length === 0) {  // If it's the first tab, load and show it immediately
        iframe.style.display = 'block';
        button.classList.add('activeTab');  // Mark the first tab as active initially
        button.classList.remove('inactiveTab');  // Remove inactive class from the first tab
        const loadSampleButton = document.getElementById(loadSampleButtonId);  // Retrieve the button by ID
        if (loadSampleButton) {
            loadSampleButton.textContent = tabName + " - Channel " + channelIndex;  // Set the button text
        }
    }

    tabContainer.appendChild(button);
}
