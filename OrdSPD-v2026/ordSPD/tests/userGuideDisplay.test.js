import { beforeEach, describe, expect, it, vi } from 'vitest';

const { makeGuideInteractiveMock } = vi.hoisted(() => ({
  makeGuideInteractiveMock: vi.fn()
}));

vi.mock('../javaScript/keySimulation.js', () => ({
  makeGuideInteractive: makeGuideInteractiveMock
}));

import { toggleUserGuide } from '../javaScript/userGuideDisplay.js';

describe('userGuideDisplay', () => {
  beforeEach(() => {
    makeGuideInteractiveMock.mockClear();
  });

  it('toggles guide visibility and button label', () => {
    document.body.innerHTML = `
      <div class="right-column">
        <button id="toggleGuide">Hide User Guide</button>
        <div id="guideContent" style="display: block;"></div>
      </div>
    `;

    toggleUserGuide();
    expect(document.getElementById('guideContent').style.display).toBe('none');
    expect(document.getElementById('toggleGuide').textContent).toBe('Show User Guide');

    toggleUserGuide();
    expect(document.getElementById('guideContent').style.display).toBe('block');
    expect(document.getElementById('toggleGuide').textContent).toBe('Hide User Guide');
  });

  it('initializes toggle UI and interactivity on DOMContentLoaded', () => {
    document.body.innerHTML = `<div class="right-column"></div>`;

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(document.querySelector('.right-column #toggleGuide')).not.toBeNull();
    expect(document.querySelector('.right-column #guideContent')).not.toBeNull();
    expect(makeGuideInteractiveMock).toHaveBeenCalledTimes(1);
  });
});
