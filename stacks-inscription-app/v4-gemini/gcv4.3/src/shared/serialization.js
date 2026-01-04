const SENSITIVE_KEY_RE =
  /(appPrivateKey|privateKey|transitKey|secret|mnemonic|seed|authResponseToken|coreSessionToken)/i;

export function isSensitiveKey(key) {
  return SENSITIVE_KEY_RE.test(String(key));
}

export function redactString(str) {
  if (typeof str !== 'string') return str;
  if (str.startsWith('eyJ') && str.includes('.') && str.length > 60) return '[JWT redacted]';
  if (/^[0-9a-f]+$/i.test(str) && str.length > 120) return str.slice(0, 32) + '…(hex truncated)';
  if (str.length > 1200) return str.slice(0, 200) + '…(truncated)';
  return str;
}

export function safeSerialize(value, maxLen = 1200) {
  try {
    const json = JSON.stringify(
      value,
      (key, val) => {
        if (typeof val === 'bigint') return `${val.toString()}n`;
        if (val instanceof Error) return { name: val.name, message: val.message, stack: val.stack };
        if (val instanceof Uint8Array) return { type: 'Uint8Array', length: val.length };
        if (typeof val === 'function') return `[Function ${val.name || 'anonymous'}]`;
        if (isSensitiveKey(key)) return '[REDACTED]';
        if (typeof val === 'string') return redactString(val);
        return val;
      },
      2
    );
    if (!json) return String(value);
    return json.length > maxLen ? json.slice(0, maxLen) + '…' : json;
  } catch {
    try {
      return String(value);
    } catch {
      return '[unserializable]';
    }
  }
}

