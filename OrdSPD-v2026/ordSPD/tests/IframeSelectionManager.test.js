import { describe, expect, it } from 'vitest';
import { IframeSelectionManager } from '../javaScript/IframeSelectionManager.js';

describe('IframeSelectionManager', () => {
  it('toggles pad selection and CSS class', () => {
    document.body.innerHTML = `
      <div id="pad-1"></div>
      <div id="pad-2"></div>
    `;
    const manager = new IframeSelectionManager();

    manager.togglePadSelection('pad-1');
    expect(manager.selectedPads.has('pad-1')).toBe(true);
    expect(document.getElementById('pad-1').classList.contains('selected-iframe')).toBe(true);

    manager.togglePadSelection('pad-1');
    expect(manager.selectedPads.has('pad-1')).toBe(false);
    expect(document.getElementById('pad-1').classList.contains('selected-iframe')).toBe(false);
  });

  it('selects multiple pads and deselects all pads', () => {
    document.body.innerHTML = `
      <div id="pad-1"></div>
      <div id="pad-2"></div>
      <div id="pad-3"></div>
    `;
    const manager = new IframeSelectionManager();

    manager.selectMultiplePads(['pad-1', 'pad-2', 'pad-3']);
    expect(manager.selectedPads.size).toBe(3);
    expect(document.getElementById('pad-2').classList.contains('selected-iframe')).toBe(true);

    manager.deselectAllPads();
    expect(manager.selectedPads.size).toBe(0);
    expect(document.getElementById('pad-1').classList.contains('selected-iframe')).toBe(false);
    expect(document.getElementById('pad-3').classList.contains('selected-iframe')).toBe(false);
  });
});
