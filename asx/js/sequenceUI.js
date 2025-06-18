// js/sequenceUI.js
import SequenceManager from './sequenceManager.js';

const SequenceUI = (() => {
  let uiContainer, navBar, prevBtn, nextBtn, sequenceTabsContainer, addBtn, duplicateBtn, removeBtn, sequenceInfoDisplay, isInitialized = false, currentSequenceData;

  const queryNav = s => navBar.querySelector(s);
  const createElement = type => document.createElement(type);

  // Helper to manage global event listeners for modals
  const activeModalListeners = new Map();

  const init = targetContainer => {
    if (isInitialized) return;
    uiContainer = targetContainer || document.body;
    buildNavigationBar();
    attachGlobalEventListeners();
    SequenceManager.subscribe(handleSequenceUpdate);
    // SequenceManager.init(); // Should be initialized by main application logic
    isInitialized = true;
    // Initial render based on current state, if SequenceManager is already initialized
    const initialInfo = SequenceManager.getSequencesInfo();
    if (initialInfo && SequenceManager.sequenceCount > 0) {
        handleSequenceUpdate({
            sequences: initialInfo,
            currentIndex: SequenceManager.currentIndex,
            currentSequence: SequenceManager.getCurrentSequence(),
            maxSequences: SequenceManager.maxSequences
        });
    } else if (initialInfo) { // SequenceManager initialized but no sequences
        handleSequenceUpdate({
            sequences: [],
            currentIndex: 0,
            currentSequence: null,
            maxSequences: SequenceManager.maxSequences
        });
    }
  };

  const buildNavigationBar = () => {
    navBar = createElement('div');
    navBar.className = 'sequence-nav';
    navBar.innerHTML = `
      <div class="sequence-nav-left">
        <button class="seq-nav-btn seq-prev-btn" title="Previous Sequence (Ctrl/Cmd + Left Arrow)">◀</button>
        <button class="seq-nav-btn seq-next-btn" title="Next Sequence (Ctrl/Cmd + Right Arrow)">▶</button>
      </div>
      <div class="sequence-nav-center">
        <div class="sequence-selector"><div class="sequence-tabs"></div></div>
      </div>
      <div class="sequence-nav-right">
        <button class="seq-nav-btn seq-add-btn" title="Add New Sequence (Ctrl/Cmd + N)">+</button>
        <button class="seq-nav-btn seq-duplicate-btn" title="Duplicate Current Sequence (Ctrl/Cmd + D)">⧉</button>
        <button class="seq-nav-btn seq-remove-btn" title="Remove Current Sequence">×</button>
        <div class="sequence-info"></div>
      </div>
    `;
    prevBtn = queryNav('.seq-prev-btn');
    nextBtn = queryNav('.seq-next-btn');
    sequenceTabsContainer = queryNav('.sequence-tabs');
    addBtn = queryNav('.seq-add-btn');
    duplicateBtn = queryNav('.seq-duplicate-btn');
    removeBtn = queryNav('.seq-remove-btn');
    sequenceInfoDisplay = queryNav('.sequence-info');

    uiContainer[uiContainer.firstChild ? 'insertBefore' : 'appendChild'](navBar, uiContainer.firstChild);
  };

  const attachGlobalEventListeners = () => {
    prevBtn.onclick = () => SequenceManager.goToPreviousSequence();
    nextBtn.onclick = () => SequenceManager.goToNextSequence();
    addBtn.onclick = presentAddSequenceOptions;
    duplicateBtn.onclick = presentDuplicateSequenceOptions;
    removeBtn.onclick = presentRemoveSequenceConfirmation;
    document.addEventListener('keydown', handleGlobalKeyboardShortcuts);
  };

  const createAndShowModal = (title, contentHTML, buttonsConfig = []) => {
    const overlay = createElement('div');
    overlay.className = 'modal-overlay'; // Added class for easier targeting
    overlay.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:10000;`;

    const modalDialog = createElement('div');
    modalDialog.className = 'modal-dialog'; // Added class
    modalDialog.style.cssText = `background:var(--color-bg-dark,#2a2a2a);border:1px solid var(--color-border,#555);border-radius:6px;padding:20px;min-width:300px;max-width:500px;box-shadow:0 10px 30px rgba(0,0,0,.5);`;

    const titleElement = createElement('h3');
    titleElement.textContent = title;
    titleElement.style.cssText = `margin:0 0 16px 0;color:var(--color-text,#fff);font-size:18px;`;

    const contentElement = createElement('div');
    contentElement.innerHTML = contentHTML;
    contentElement.style.cssText = `margin-bottom:20px;color:var(--color-text,#fff);line-height:1.4;`;

    const buttonsContainer = createElement('div');
    buttonsContainer.style.cssText = `display:flex;gap:8px;justify-content:flex-end;`;

    const removeModal = () => {
        overlay.remove();
        const escapeListener = activeModalListeners.get(overlay);
        if (escapeListener) {
            document.removeEventListener('keydown', escapeListener);
            activeModalListeners.delete(overlay);
        }
    };

    buttonsConfig.forEach(btnConf => {
      const button = createElement('button');
      button.textContent = btnConf.text;
      button.style.cssText = `padding:8px 16px;border:1px solid ${btnConf.danger ? '#dc3545' : (btnConf.primary ? '#007acc' : '#555')};background:${btnConf.danger ? '#dc3545' : (btnConf.primary ? '#007acc' : '#444')};color:#fff;border-radius:3px;cursor:pointer;font-size:14px;`;
      if (btnConf.id) button.id = btnConf.id;
      button.onclick = () => {
        if (btnConf.handler) {
          btnConf.handler(removeModal); // Pass removeModal closure to the handler
        } else {
          removeModal(); // Default action if no handler
        }
      };
      buttonsContainer.appendChild(button);
    });

    modalDialog.append(titleElement, contentElement, buttonsContainer);
    overlay.appendChild(modalDialog);

    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        const cancelBtnConf = buttonsConfig.find(b => b.isCancel);
        if (cancelBtnConf && cancelBtnConf.handler) {
          cancelBtnConf.handler(removeModal);
        } else {
          removeModal();
        }
      }
    };
    
    overlay.onclick = (e) => {
      if (e.target === overlay) { // Clicked on overlay background
        const cancelBtnConf = buttonsConfig.find(b => b.isCancel);
        if (cancelBtnConf && cancelBtnConf.handler) {
          cancelBtnConf.handler(removeModal);
        } else {
          removeModal();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    activeModalListeners.set(overlay, handleEscapeKey); // Store listener for removal

    document.body.appendChild(overlay);
    return overlay; // Return overlay for focusing elements within it if needed
  };

  const displayNotification = (message, type = 'success') => {
    const notificationElement = createElement('div');
    notificationElement.className = `notification ${type}`; // Add type as class
    notificationElement.style.cssText = `position:fixed;top:20px;right:20px;background:${type === 'error' ? '#dc3545' : '#28a745'};color:white;padding:12px 20px;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:10001;font-size:14px;max-width:300px;opacity:0;transform:translateX(100%);transition:all .3s ease-out;`;
    notificationElement.textContent = message;
    document.body.appendChild(notificationElement);
    setTimeout(() => {
      notificationElement.style.opacity = '1';
      notificationElement.style.transform = 'translateX(0)';
    }, 10);
    setTimeout(() => {
      notificationElement.style.opacity = '0';
      notificationElement.style.transform = 'translateX(100%)';
      setTimeout(() => notificationElement.remove(), 300);
    }, 3000);
  };
  
  const promptForDuplicateSequenceName = (originalName) => {
    return new Promise((resolve) => {
      const suggestedName = `${originalName} Copy`;
      const inputId = 'duplicate-seq-name-input';

      createAndShowModal('Name Duplicated Sequence', `
        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;" for="${inputId}">New Sequence Name:</label>
          <input type="text" id="${inputId}" value="${suggestedName}" placeholder="Sequence Name" style="width:100%;padding:8px;border:1px solid #555;background:#333;color:#fff;border-radius:3px;">
        </div>
      `, [
        {
          text: 'Duplicate', primary: true, handler: (removeSelf) => {
            const nameInput = document.getElementById(inputId);
            const newName = nameInput ? nameInput.value.trim() : suggestedName;
            removeSelf();
            resolve(newName || suggestedName); // Fallback if empty
          }
        },
        {
          text: 'Cancel', isCancel: true, handler: (removeSelf) => {
            removeSelf();
            resolve(null); // Cancelled
          }
        }
      ]);
      
      setTimeout(() => document.getElementById(inputId)?.focus(), 50);
      setTimeout(() => document.getElementById(inputId)?.select(), 55); // select after focus
    });
  };

  const presentAddSequenceOptions = () => {
    const nameInputId = 'new-seq-name-input';
    const copyCheckboxId = 'copy-current-seq-checkbox';

    const modalOverlay = createAndShowModal('Add New Sequence', `
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:8px;" for="${nameInputId}">Sequence Name:</label>
        <input type="text" id="${nameInputId}" placeholder="New Sequence" style="width:100%;padding:8px;border:1px solid #555;background:#333;color:#fff;border-radius:3px;">
      </div>
      <div style="margin-bottom:16px;">
     
        </label>
      </div>
    `, [
      {
        text: 'Create', primary: true, handler: async (removeSelf) => {
          const nameInput = document.getElementById(nameInputId);
          const copyCheckbox = document.getElementById(copyCheckboxId);
          const name = (nameInput?.value.trim() || 'New Sequence');
          const copyCurrent = copyCheckbox?.checked || false;
          
          const createButton = modalOverlay.querySelector('.modal-dialog button'); // Crude way to get the button
          if(createButton) createButton.disabled = true;

          try {
            const success = await SequenceManager.addSequence(name, copyCurrent);
            if (success) {
              displayNotification('New sequence created successfully.');
              removeSelf();
            } else {
              displayNotification('Failed to create sequence. See console.', 'error');
              if(createButton) createButton.disabled = false;
            }
          } catch (error) {
            console.error("Error adding sequence:", error);
            displayNotification('Error creating sequence.', 'error');
            if(createButton) createButton.disabled = false;
          }
        }
      },
      { text: 'Cancel', isCancel: true, handler: (removeSelf) => removeSelf() }
    ]);
    setTimeout(() => document.getElementById(nameInputId)?.focus(), 50);
  };

  const presentDuplicateSequenceOptions = async () => {
    const i = SequenceManager.currentIndex;
    const currentSeq = SequenceManager.getCurrentSequence();
    if (!currentSeq) {
      displayNotification('No sequence to duplicate.', 'error');
      return;
    }

    const newName = await promptForDuplicateSequenceName(currentSeq.name);
    if (newName === null) {
      displayNotification('Duplication cancelled.');
      return;
    }

    duplicateBtn.disabled = true; // Prevent double click
    try {
      const success = await SequenceManager.duplicateSequence(i, newName);
      displayNotification(success ? `Sequence duplicated as "${newName}".` : 'Failed to duplicate sequence.', success ? 'success' : 'error');
    } catch (error) {
      console.error("Error during duplication:", error);
      displayNotification('Error duplicating sequence.', 'error');
    } finally {
        if (currentSequenceData && currentSequenceData.sequences.length < currentSequenceData.maxSequences) {
            duplicateBtn.disabled = false;
        }
    }
  };

  const presentRemoveSequenceConfirmation = () => {
    if (!currentSequenceData || !currentSequenceData.currentSequence) {
      displayNotification('No sequence selected.', 'error');
      return;
    }
    const { name: seqName, index: seqIndex } = currentSequenceData.currentSequence;
    if (currentSequenceData.sequences.length <= 1) {
        displayNotification('Cannot remove the last sequence.', 'error');
        return;
    }

    createAndShowModal('Remove Sequence', `
      <p>Are you sure you want to remove sequence "<strong>${seqName}</strong>"?</p>
      <p style="color:#ff6b6b;font-size:14px;">This action cannot be undone.</p>
    `, [
      {
        text: 'Remove', primary: true, danger: true, handler: async (removeSelf) => {
          removeBtn.disabled = true; // Prevent double click
          try {
            const success = await SequenceManager.removeSequence(seqIndex);
            displayNotification(success ? 'Sequence removed.' : 'Failed to remove sequence.', success ? 'success' : 'error');
            removeSelf();
          } catch (error) {
            console.error("Error removing sequence:", error);
            displayNotification('Error removing sequence.', 'error');
          } finally {
            if (currentSequenceData && currentSequenceData.sequences.length > 1) {
                 removeBtn.disabled = false;
            }
          }
        }
      },
      { text: 'Cancel', isCancel: true, handler: (removeSelf) => removeSelf() }
    ]);
  };
  
  const handleGlobalKeyboardShortcuts = e => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    if (modKey) {
      switch (e.key.toLowerCase()) {
        case 'arrowleft': e.preventDefault(); SequenceManager.goToPreviousSequence(); break;
        case 'arrowright': e.preventDefault(); SequenceManager.goToNextSequence(); break;
        case 'n': e.preventDefault(); presentAddSequenceOptions(); break;
        case 'd':
          e.preventDefault();
          (async () => { // IIFE for async operation
            const i = SequenceManager.currentIndex;
            const currentSeq = SequenceManager.getCurrentSequence();
            if (!currentSeq) return;
            const newName = await promptForDuplicateSequenceName(currentSeq.name);
            if (newName === null) return; // Cancelled
            try {
              await SequenceManager.duplicateSequence(i, newName);
            } catch (err) { console.error("Shortcut duplication error:", err); }
          })();
          break;
      }
    }
  };

  const handleSequenceUpdate = (managerInfo) => {
    currentSequenceData = managerInfo;
    renderNavigationButtons();
    renderSequenceTabs();
    renderSequenceInfoDisplay();
    if (navBar) {
        navBar.classList.add('sequence-switch-animation');
        setTimeout(() => navBar.classList.remove('sequence-switch-animation'), 200);
    }
  };

  const renderNavigationButtons = () => {
    if (!currentSequenceData || !currentSequenceData.sequences) return;
    const { sequences, maxSequences } = currentSequenceData;
    const canNavigate = sequences.length > 1;
    prevBtn.disabled = !canNavigate;
    nextBtn.disabled = !canNavigate;
    removeBtn.disabled = sequences.length <= 1;
    const canAddMore = sequences.length < maxSequences;
    addBtn.disabled = !canAddMore;
    duplicateBtn.disabled = !canAddMore || sequences.length === 0;
  };

  const renderSequenceTabs = () => {
    if (!currentSequenceData || !currentSequenceData.sequences || !sequenceTabsContainer) return;
    const { sequences, currentIndex } = currentSequenceData;
    sequenceTabsContainer.innerHTML = ''; // Clear existing tabs

    sequences.forEach((seq, i) => {
      const tabElement = createElement('div');
      tabElement.className = `sequence-tab${i === currentIndex ? ' active' : ''}`;
      tabElement.dataset.index = i;
      tabElement.title = `${seq.name}\nCreated: ${new Date(seq.created).toLocaleString()}\nModified: ${new Date(seq.modified).toLocaleString()}`;
      
      const nameInputElement = createElement('input');
      nameInputElement.type = 'text';
      nameInputElement.className = 'sequence-name-input';
      nameInputElement.value = seq.name;
      nameInputElement.readOnly = true;
      nameInputElement.setAttribute('aria-label', `Sequence name for ${seq.name}`);
      
      tabElement.appendChild(nameInputElement);
      tabElement.onclick = (e) => {
        if ((e.target === nameInputElement && !nameInputElement.readOnly) || i === currentIndex) return;
        SequenceManager.switchToSequence(i);
      };
      tabElement.ondblclick = (e) => {
        if (e.target === nameInputElement) {
          e.preventDefault();
          initiateSequenceRename(nameInputElement, i);
        }
      };
      sequenceTabsContainer.appendChild(tabElement);
    });

    const activeTab = sequenceTabsContainer.querySelector('.sequence-tab.active');
    activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  const initiateSequenceRename = (inputElement, index) => {
    if (!currentSequenceData || !currentSequenceData.sequences[index]) return;
    const originalName = currentSequenceData.sequences[index].name;
    inputElement.readOnly = false;
    inputElement.focus();
    inputElement.select();
    
    const finalizeRename = () => {
      inputElement.readOnly = true;
      const newName = inputElement.value.trim();
      if (newName && newName !== originalName) {
        SequenceManager.renameSequence(index, newName);
      } else {
        inputElement.value = originalName; // Revert
      }
      inputElement.removeEventListener('blur', blurHandler);
      inputElement.removeEventListener('keydown', keydownHandler);
    };

    const blurHandler = () => finalizeRename();
    const keydownHandler = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finalizeRename(); }
      if (e.key === 'Escape') { e.preventDefault(); inputElement.value = originalName; finalizeRename(); }
    };

    inputElement.addEventListener('blur', blurHandler);
    inputElement.addEventListener('keydown', keydownHandler);
  };

  const renderSequenceInfoDisplay = () => {
    if (!currentSequenceData || !currentSequenceData.sequences || !sequenceInfoDisplay) return;
    const { sequences, currentIndex } = currentSequenceData;
    sequenceInfoDisplay.textContent = sequences.length > 0 ? `${currentIndex + 1}/${sequences.length}` : 'No Sequences';
  };

  const getNavigationBarElement = () => navBar;

  const destroyUI = () => {
    navBar?.remove();
    document.removeEventListener('keydown', handleGlobalKeyboardShortcuts);
    // Unsubscribe from SequenceManager is crucial if this module can be re-initialized.
    // This requires SequenceManager.subscribe to return an unsubscribe function.
    // Example: if (unsubscribeFn) unsubscribeFn();
    isInitialized = false;
    currentSequenceData = null;
    activeModalListeners.forEach((listener, overlay) => {
        document.removeEventListener('keydown', listener);
        overlay.remove();
    });
    activeModalListeners.clear();
  };

  return { 
    init, 
    destroy: destroyUI, 
    getNavigationBar: getNavigationBarElement,
    _getCurrentSequenceData: () => currentSequenceData // For debugging or specific external needs
  };
})();

export default SequenceUI;