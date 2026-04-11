import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postKeyEventToIframesMock } = vi.hoisted(() => ({
  postKeyEventToIframesMock: vi.fn()
}));

vi.mock('../javaScript/iframeCommunication.js', () => ({
  postKeyEventToIframes: postKeyEventToIframesMock
}));

async function importKeySimulation() {
  vi.resetModules();
  return import('../javaScript/keySimulation.js');
}

describe('keySimulation', () => {
  beforeEach(() => {
    postKeyEventToIframesMock.mockClear();
  });

  it('exposes expected key mappings', async () => {
    const { keyMap } = await importKeySimulation();

    expect(keyMap['-']).toEqual({ keyCode: 189, shiftKey: false, ctrlKey: false });
    expect(keyMap['Ctrl+Shift+}']).toEqual({ keyCode: 221, shiftKey: true, ctrlKey: true });
    expect(keyMap['m']).toEqual({ keyCode: 77, shiftKey: false, ctrlKey: false });
  });

  it('wires kbd clicks to simulated keydown/keyup and iframe messages', async () => {
    document.body.innerHTML = `
      <div class="instructions-container">
        <kbd>-</kbd>
      </div>
    `;
    const events = [];
    document.addEventListener('keydown', (event) => events.push({ type: 'keydown', keyCode: event.keyCode }));
    document.addEventListener('keyup', (event) => events.push({ type: 'keyup', keyCode: event.keyCode }));

    const { makeGuideInteractive } = await importKeySimulation();
    makeGuideInteractive();

    document.querySelector('kbd').click();

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'keydown', keyCode: 189 });
    expect(events[1]).toEqual({ type: 'keyup', keyCode: 189 });
    expect(postKeyEventToIframesMock).toHaveBeenCalledWith('-');
  });

  it('normalizes "<" to comma key mapping before posting', async () => {
    document.body.innerHTML = `
      <div class="instructions-container">
        <kbd>&lt;</kbd>
      </div>
    `;

    const { makeGuideInteractive } = await importKeySimulation();
    makeGuideInteractive();
    document.querySelector('kbd').click();

    expect(postKeyEventToIframesMock).toHaveBeenCalledWith(',');
  });
});
