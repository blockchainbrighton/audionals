// js/sequenceUI.js
import SequenceManager from './sequenceManager.js';

const SequenceUI = (() => {
  let container, navBar, prevBtn, nextBtn, sequenceTabs, addBtn, duplicateBtn, removeBtn, sequenceInfo, isInitialized = false, currentSequenceInfo;

  const qs = s => navBar.querySelector(s);
  const $ = s => document.createElement(s);

  const init = target => {
    if (isInitialized) return;
    container = target || document.body;
    createNavigationBar();
    bindEvents();
    SequenceManager.subscribe(onSequenceUpdate);
    SequenceManager.init();
    isInitialized = true;
  };

  const createNavigationBar = () => {
    navBar = $('div');
    navBar.className = 'sequence-nav';
    navBar.innerHTML = `
      <div class="sequence-nav-left">
        <button class="seq-nav-btn seq-prev-btn" title="Previous Sequence">◀</button>
        <button class="seq-nav-btn seq-next-btn" title="Next Sequence">▶</button>
      </div>
      <div class="sequence-nav-center">
        <div class="sequence-selector"><div class="sequence-tabs"></div></div>
      </div>
      <div class="sequence-nav-right">
        <button class="seq-nav-btn seq-add-btn" title="Add New Sequence">+</button>
        <button class="seq-nav-btn seq-duplicate-btn" title="Duplicate Current Sequence">⧉</button>
        <button class="seq-nav-btn seq-remove-btn" title="Remove Current Sequence">×</button>
        <div class="sequence-info"></div>
      </div>
    `;
    [prevBtn, nextBtn, sequenceTabs, addBtn, duplicateBtn, removeBtn, sequenceInfo] = 
      ['.seq-prev-btn', '.seq-next-btn', '.sequence-tabs', '.seq-add-btn', '.seq-duplicate-btn', '.seq-remove-btn', '.sequence-info'].map(qs);
    container[container.firstChild ? 'insertBefore' : 'appendChild'](navBar, container.firstChild);
  };

  const bindEvents = () => {
    prevBtn.onclick = () => SequenceManager.goToPreviousSequence();
    nextBtn.onclick = () => SequenceManager.goToNextSequence();
    addBtn.onclick = showAddSequenceOptions;
    duplicateBtn.onclick = () => {
      const i = SequenceManager.currentIndex;
      showNotification(SequenceManager.duplicateSequence(i) ? 'Sequence duplicated successfully' : 'Failed to duplicate sequence', SequenceManager.duplicateSequence(i) ? undefined : 'error');
    };
    removeBtn.onclick = showRemoveSequenceConfirmation;
    document.addEventListener('keydown', handleKeyboardShortcuts);
  };

  const handleKeyboardShortcuts = e => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') return e.preventDefault(), SequenceManager.goToPreviousSequence();
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') return e.preventDefault(), SequenceManager.goToNextSequence();
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') return e.preventDefault(), showAddSequenceOptions();
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') return e.preventDefault(), SequenceManager.duplicateSequence(SequenceManager.currentIndex);
  };

  const onSequenceUpdate = info => {
    currentSequenceInfo = info;
    updateNavigationButtons();
    updateSequenceTabs();
    updateSequenceInfo();
    navBar?.classList.add('sequence-switch-animation');
    setTimeout(() => navBar?.classList.remove('sequence-switch-animation'), 200);
  };

  const updateNavigationButtons = () => {
    if (!currentSequenceInfo) return;
    const { sequences, currentIndex, maxSequences } = currentSequenceInfo;
    const multi = sequences.length > 1;
    prevBtn.disabled = nextBtn.disabled = !multi;
    removeBtn.disabled = sequences.length <= 1;
    duplicateBtn.disabled = addBtn.disabled = sequences.length >= maxSequences;
  };

  const updateSequenceTabs = () => {
    if (!currentSequenceInfo || !sequenceTabs) return;
    const { sequences, currentIndex } = currentSequenceInfo;
    sequenceTabs.innerHTML = '';
    sequences.forEach((seq, i) => {
      const tab = $('div');
      tab.className = `sequence-tab${i === currentIndex ? ' active' : ''}`;
      tab.dataset.index = i;
      tab.title = `${seq.name} (Created: ${new Date(seq.created).toLocaleString()})`;
      const nameInput = $('input');
      nameInput.type = 'text';
      nameInput.className = 'sequence-name-input';
      nameInput.value = seq.name;
      nameInput.readOnly = true;
      tab.appendChild(nameInput);
      tab.onclick = e => (e.target !== nameInput || nameInput.readOnly) && SequenceManager.switchToSequence(i);
      tab.ondblclick = e => (e.preventDefault(), startRenaming(nameInput, i));
      sequenceTabs.appendChild(tab);
    });
  };

  const startRenaming = (input, i) => {
    input.readOnly = false;
    input.focus();
    input.select();
    const finish = () => {
      input.readOnly = true;
      const v = input.value.trim();
      if (v && v !== currentSequenceInfo.sequences[i].name) SequenceManager.renameSequence(i, v);
      else input.value = currentSequenceInfo.sequences[i].name;
    };
    input.addEventListener('blur', finish, { once: true });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') return e.preventDefault(), finish();
      if (e.key === 'Escape') input.value = currentSequenceInfo.sequences[i].name, finish();
    }, { once: true });
  };

  const updateSequenceInfo = () => {
    if (!currentSequenceInfo || !sequenceInfo) return;
    const { sequences, currentIndex } = currentSequenceInfo;
    sequenceInfo.textContent = `${currentIndex + 1}/${sequences.length}`;
  };

  const showAddSequenceOptions = () => {
    const modal = createModal('Add New Sequence', `
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:8px;">Sequence Name:</label>
        <input type="text" id="new-sequence-name" placeholder="New Sequence" style="width:100%;padding:8px;border:1px solid #555;background:#333;color:#fff;border-radius:3px;">
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="copy-current-sequence">Copy current sequence pattern
        </label>
      </div>
    `, [
      {
        text: 'Create', primary: true, handler: () => {
          const name = (document.getElementById('new-sequence-name').value.trim() || 'New Sequence');
          if (SequenceManager.addSequence(name, document.getElementById('copy-current-sequence').checked)) {
            showNotification('New sequence created successfully');
            modal.remove();
          } else showNotification('Failed to create sequence', 'error');
        }
      },
      { text: 'Cancel', handler: () => modal.remove() }
    ]);
    setTimeout(() => {
      const nameInput = document.getElementById('new-sequence-name');
      nameInput?.focus();
      nameInput?.select();
    }, 100);
  };

  const showRemoveSequenceConfirmation = () => {
    if (!currentSequenceInfo) return;
    const curr = currentSequenceInfo.sequences[currentSequenceInfo.currentIndex];
    const modal = createModal('Remove Sequence', `
      <p>Are you sure you want to remove the sequence "<strong>${curr.name}</strong>"?</p>
      <p style="color:#ff6b6b;font-size:14px;">This action cannot be undone.</p>
    `, [
      {
        text: 'Remove', primary: true, danger: true, handler: () => {
          if (SequenceManager.removeSequence(currentSequenceInfo.currentIndex)) {
            showNotification('Sequence removed successfully');
            modal.remove();
          } else showNotification('Failed to remove sequence', 'error');
        }
      },
      { text: 'Cancel', handler: () => modal.remove() }
    ]);
  };

  const createModal = (title, content, buttons = []) => {
    const overlay = $('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:10000;`;
    const modal = $('div');
    modal.style.cssText = `background:var(--color-bg-dark,#2a2a2a);border:1px solid var(--color-border,#555);border-radius:6px;padding:20px;min-width:300px;max-width:500px;box-shadow:0 10px 30px rgba(0,0,0,.5);`;
    const titleEl = $('h3'); titleEl.textContent = title; titleEl.style.cssText = `margin:0 0 16px 0;color:var(--color-text,#fff);font-size:18px;`;
    const contentEl = $('div'); contentEl.innerHTML = content; contentEl.style.cssText = `margin-bottom:20px;color:var(--color-text,#fff);line-height:1.4;`;
    const buttonsEl = $('div'); buttonsEl.style.cssText = `display:flex;gap:8px;justify-content:flex-end;`;
    buttons.forEach(btn => {
      const b = $('button');
      b.textContent = btn.text;
      b.style.cssText = `padding:8px 16px;border:1px solid ${btn.danger ? '#dc3545' : (btn.primary ? '#007acc' : '#555')};background:${btn.danger ? '#dc3545' : (btn.primary ? '#007acc' : '#444')};color:#fff;border-radius:3px;cursor:pointer;font-size:14px;`;
      b.onclick = btn.handler; buttonsEl.appendChild(b);
    });
    [titleEl, contentEl, buttonsEl].forEach(el => modal.appendChild(el)); overlay.appendChild(modal);
    overlay.onclick = e => e.target === overlay && overlay.remove();
    const handleEscape = e => e.key === 'Escape' && (overlay.remove(), document.removeEventListener('keydown', handleEscape));
    document.addEventListener('keydown', handleEscape);
    document.body.appendChild(overlay);
    return overlay;
  };

  const showNotification = (message, type = 'success') => {
    const notification = $('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${type === 'error' ? '#dc3545' : '#28a745'};color:white;padding:12px 20px;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:10001;font-size:14px;max-width:300px;opacity:0;transform:translateX(100%);transition:all .3s ease;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.opacity = '1'; notification.style.transform = 'translateX(0)'; }, 10);
    setTimeout(() => { notification.style.opacity = '0'; notification.style.transform = 'translateX(100%)'; setTimeout(() => notification.remove(), 300); }, 3000);
  };

  const getNavigationBar = () => navBar;

  const destroy = () => {
    navBar?.parentNode?.removeChild(navBar);
    document.removeEventListener('keydown', handleKeyboardShortcuts);
    isInitialized = false;
  };

  return { init, destroy, getNavigationBar, _getCurrentSequenceInfo: () => currentSequenceInfo };
})();

export default SequenceUI;
