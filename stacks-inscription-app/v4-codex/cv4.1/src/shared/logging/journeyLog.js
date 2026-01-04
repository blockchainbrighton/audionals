import { safeSerialize } from '../serialization.js';

export function createJourneyLog({ containerId = 'journey-log' } = {}) {
  return (msg, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}] ${msg}`;
    // Keep console logging for developer tools, but redact/truncate UI logs.
    console.log(logMsg, data || '');

    const el = document.getElementById(containerId);
    if (!el) return;

    const div = document.createElement('div');
    const isLong =
      msg.startsWith('AUTH DEBUG DUMP') ||
      msg.startsWith('[console.error]') ||
      msg.startsWith('[window.error]') ||
      msg.startsWith('[unhandledrejection]');
    const maxLen = isLong ? 2200 : 250;

    if (data !== null && data !== undefined) {
      const serialized = safeSerialize(data, maxLen);
      div.innerText = `${logMsg} ${serialized}`;
    } else {
      div.innerText = logMsg;
    }

    el.prepend(div);
  };
}

