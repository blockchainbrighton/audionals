// js/sequenceUI.js

/**
 * Sequence Navigation UI Module
 * 
 * Handles all UI interactions for multi-sequence navigation,
 * including sequence tabs, navigation buttons, and sequence management.
 */

import SequenceManager from './sequenceManager.js';

const SequenceUI = (() => {
  let container = null;
  let isInitialized = false;
  
  // UI element references
  let navBar = null;
  let prevBtn = null;
  let nextBtn = null;
  let sequenceTabs = null;
  let addBtn = null;
  let duplicateBtn = null;
  let removeBtn = null;
  let sequenceInfo = null;
  
  // State
  let currentSequenceInfo = null;
  
  // Initialize the sequence navigation UI
  const init = (targetContainer) => {
    if (isInitialized) return;
    
    container = targetContainer || document.body;
    createNavigationBar();
    bindEvents();
    
    // Subscribe to sequence manager updates
    SequenceManager.subscribe(onSequenceUpdate);
    
    // Initialize sequence manager
    SequenceManager.init();
    
    isInitialized = true;
  };
  
  // Create the navigation bar HTML
  const createNavigationBar = () => {
    navBar = document.createElement('div');
    navBar.className = 'sequence-nav';
    navBar.innerHTML = `
      <div class="sequence-nav-left">
        <button class="seq-nav-btn seq-prev-btn" title="Previous Sequence">◀</button>
        <button class="seq-nav-btn seq-next-btn" title="Next Sequence">▶</button>
      </div>
      
      <div class="sequence-nav-center">
        <div class="sequence-selector">
          <div class="sequence-tabs"></div>
        </div>
      </div>
      
      <div class="sequence-nav-right">
        <button class="seq-nav-btn seq-add-btn" title="Add New Sequence">+</button>
        <button class="seq-nav-btn seq-duplicate-btn" title="Duplicate Current Sequence">⧉</button>
        <button class="seq-nav-btn seq-remove-btn" title="Remove Current Sequence">×</button>
        <div class="sequence-info"></div>
      </div>
    `;
    
    // Get element references
    prevBtn = navBar.querySelector('.seq-prev-btn');
    nextBtn = navBar.querySelector('.seq-next-btn');
    sequenceTabs = navBar.querySelector('.sequence-tabs');
    addBtn = navBar.querySelector('.seq-add-btn');
    duplicateBtn = navBar.querySelector('.seq-duplicate-btn');
    removeBtn = navBar.querySelector('.seq-remove-btn');
    sequenceInfo = navBar.querySelector('.sequence-info');
    
    // Insert navigation bar at the beginning of container
    if (container.firstChild) {
      container.insertBefore(navBar, container.firstChild);
    } else {
      container.appendChild(navBar);
    }
  };
  
  // Bind event listeners
  const bindEvents = () => {
    // Navigation buttons
    prevBtn.addEventListener('click', () => {
      SequenceManager.goToPreviousSequence();
    });
    
    nextBtn.addEventListener('click', () => {
      SequenceManager.goToNextSequence();
    });
    
    // Action buttons
    addBtn.addEventListener('click', () => {
      showAddSequenceOptions();
    });
    
    duplicateBtn.addEventListener('click', () => {
      const currentIndex = SequenceManager.currentIndex;
      if (SequenceManager.duplicateSequence(currentIndex)) {
        showNotification('Sequence duplicated successfully');
      } else {
        showNotification('Failed to duplicate sequence', 'error');
      }
    });
    
    removeBtn.addEventListener('click', () => {
      showRemoveSequenceConfirmation();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
  };
  
  // Handle keyboard shortcuts
  const handleKeyboardShortcuts = (e) => {
    // Only handle shortcuts when not typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Ctrl/Cmd + Left Arrow - Previous sequence
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
      e.preventDefault();
      SequenceManager.goToPreviousSequence();
    }
    
    // Ctrl/Cmd + Right Arrow - Next sequence
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
      e.preventDefault();
      SequenceManager.goToNextSequence();
    }
    
    // Ctrl/Cmd + N - New sequence
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      showAddSequenceOptions();
    }
    
    // Ctrl/Cmd + D - Duplicate sequence
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      const currentIndex = SequenceManager.currentIndex;
      SequenceManager.duplicateSequence(currentIndex);
    }
  };
  
  // Update UI when sequence changes
  const onSequenceUpdate = (sequenceInfo) => {
    currentSequenceInfo = sequenceInfo;
    updateNavigationButtons();
    updateSequenceTabs();
    updateSequenceInfo();
    
    // Add animation class to indicate sequence change
    if (navBar) {
      navBar.classList.add('sequence-switch-animation');
      setTimeout(() => {
        navBar.classList.remove('sequence-switch-animation');
      }, 200);
    }
  };
  
  // Update navigation button states
  const updateNavigationButtons = () => {
    if (!currentSequenceInfo) return;
    
    const { sequences, currentIndex } = currentSequenceInfo;
    const hasMultipleSequences = sequences.length > 1;
    
    prevBtn.disabled = !hasMultipleSequences;
    nextBtn.disabled = !hasMultipleSequences;
    removeBtn.disabled = sequences.length <= 1;
    duplicateBtn.disabled = sequences.length >= currentSequenceInfo.maxSequences;
    addBtn.disabled = sequences.length >= currentSequenceInfo.maxSequences;
  };
  
  // Update sequence tabs
  const updateSequenceTabs = () => {
    if (!currentSequenceInfo || !sequenceTabs) return;
    
    const { sequences, currentIndex } = currentSequenceInfo;
    
    // Clear existing tabs
    sequenceTabs.innerHTML = '';
    
    // Create tabs for each sequence
    sequences.forEach((seq, index) => {
      const tab = document.createElement('div');
      tab.className = `sequence-tab ${index === currentIndex ? 'active' : ''}`;
      tab.dataset.index = index;
      tab.title = `${seq.name} (Created: ${new Date(seq.created).toLocaleString()})`;
      
      // Create name input for inline editing
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'sequence-name-input';
      nameInput.value = seq.name;
      nameInput.readOnly = true;
      
      tab.appendChild(nameInput);
      
      // Tab click handler
      tab.addEventListener('click', (e) => {
        if (e.target === nameInput && !nameInput.readOnly) return;
        SequenceManager.switchToSequence(index);
      });
      
      // Double-click to rename
      tab.addEventListener('dblclick', (e) => {
        e.preventDefault();
        startRenaming(nameInput, index);
      });
      
      sequenceTabs.appendChild(tab);
    });
  };
  
  // Start renaming a sequence
  const startRenaming = (input, sequenceIndex) => {
    input.readOnly = false;
    input.focus();
    input.select();
    
    const finishRename = () => {
      input.readOnly = true;
      const newName = input.value.trim();
      if (newName && newName !== currentSequenceInfo.sequences[sequenceIndex].name) {
        SequenceManager.renameSequence(sequenceIndex, newName);
      } else {
        // Restore original name if empty or unchanged
        input.value = currentSequenceInfo.sequences[sequenceIndex].name;
      }
    };
    
    input.addEventListener('blur', finishRename, { once: true });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishRename();
      } else if (e.key === 'Escape') {
        input.value = currentSequenceInfo.sequences[sequenceIndex].name;
        finishRename();
      }
    }, { once: true });
  };
  
  // Update sequence info display
  const updateSequenceInfo = () => {
    if (!currentSequenceInfo || !sequenceInfo) return;
    
    const { sequences, currentIndex } = currentSequenceInfo;
    const current = sequences[currentIndex];
    
    sequenceInfo.textContent = `${currentIndex + 1}/${sequences.length}`;
  };
  
  // Show add sequence options
  const showAddSequenceOptions = () => {
    const modal = createModal('Add New Sequence', `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px;">Sequence Name:</label>
        <input type="text" id="new-sequence-name" placeholder="New Sequence" 
               style="width: 100%; padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 3px;">
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="copy-current-sequence">
          Copy current sequence pattern
        </label>
      </div>
    `, [
      {
        text: 'Create',
        primary: true,
        handler: () => {
          const nameInput = document.getElementById('new-sequence-name');
          const copyCheckbox = document.getElementById('copy-current-sequence');
          const name = nameInput.value.trim() || 'New Sequence';
          const copyFromCurrent = copyCheckbox.checked;
          
          if (SequenceManager.addSequence(name, copyFromCurrent)) {
            showNotification('New sequence created successfully');
            modal.remove();
          } else {
            showNotification('Failed to create sequence', 'error');
          }
        }
      },
      {
        text: 'Cancel',
        handler: () => modal.remove()
      }
    ]);
    
    // Focus name input
    setTimeout(() => {
      const nameInput = document.getElementById('new-sequence-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }, 100);
  };
  
  // Show remove sequence confirmation
  const showRemoveSequenceConfirmation = () => {
    if (!currentSequenceInfo) return;
    
    const currentSeq = currentSequenceInfo.sequences[currentSequenceInfo.currentIndex];
    
    const modal = createModal('Remove Sequence', `
      <p>Are you sure you want to remove the sequence "<strong>${currentSeq.name}</strong>"?</p>
      <p style="color: #ff6b6b; font-size: 14px;">This action cannot be undone.</p>
    `, [
      {
        text: 'Remove',
        primary: true,
        danger: true,
        handler: () => {
          if (SequenceManager.removeSequence(currentSequenceInfo.currentIndex)) {
            showNotification('Sequence removed successfully');
            modal.remove();
          } else {
            showNotification('Failed to remove sequence', 'error');
          }
        }
      },
      {
        text: 'Cancel',
        handler: () => modal.remove()
      }
    ]);
  };
  
  // Create modal dialog
  const createModal = (title, content, buttons = []) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: var(--color-bg-dark, #2a2a2a);
      border: 1px solid var(--color-border, #555);
      border-radius: 6px;
      padding: 20px;
      min-width: 300px;
      max-width: 500px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    `;
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0 0 16px 0;
      color: var(--color-text, #fff);
      font-size: 18px;
    `;
    
    const contentEl = document.createElement('div');
    contentEl.innerHTML = content;
    contentEl.style.cssText = `
      margin-bottom: 20px;
      color: var(--color-text, #fff);
      line-height: 1.4;
    `;
    
    const buttonsEl = document.createElement('div');
    buttonsEl.style.cssText = `
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    `;
    
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.text;
      button.style.cssText = `
        padding: 8px 16px;
        border: 1px solid ${btn.danger ? '#dc3545' : (btn.primary ? '#007acc' : '#555')};
        background: ${btn.danger ? '#dc3545' : (btn.primary ? '#007acc' : '#444')};
        color: #fff;
        border-radius: 3px;
        cursor: pointer;
        font-size: 14px;
      `;
      
      button.addEventListener('click', btn.handler);
      buttonsEl.appendChild(button);
    });
    
    modal.appendChild(titleEl);
    modal.appendChild(contentEl);
    modal.appendChild(buttonsEl);
    overlay.appendChild(modal);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    document.body.appendChild(overlay);
    return overlay;
  };
  
  // Show notification
  const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#dc3545' : '#28a745'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10001;
      font-size: 14px;
      max-width: 300px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };
  
  // Get the navigation bar element (for external positioning)
  const getNavigationBar = () => navBar;
  
  // Destroy the UI
  const destroy = () => {
    if (navBar && navBar.parentNode) {
      navBar.parentNode.removeChild(navBar);
    }
    
    document.removeEventListener('keydown', handleKeyboardShortcuts);
    isInitialized = false;
  };
  
  // Public API
  return {
    init,
    destroy,
    getNavigationBar,
    
    // For debugging
    _getCurrentSequenceInfo: () => currentSequenceInfo
  };
})();

export default SequenceUI;

