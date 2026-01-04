export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function updatedAgo(timestampMs) {
  if (!timestampMs) return null;
  const sec = Math.max(0, Math.round((Date.now() - timestampMs) / 1000));
  return sec < 60 ? `${sec}s` : `${Math.round(sec / 60)}m`;
}

