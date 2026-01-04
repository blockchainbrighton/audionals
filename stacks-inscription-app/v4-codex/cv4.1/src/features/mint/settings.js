export function getFeePerTxMicroStx() {
  const el = document.getElementById('fee-per-tx');
  const raw = el ? Number(el.value) : NaN;
  const fee = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 500_000;
  return fee;
}

export function isSafeModeEnabled() {
  return Boolean(document.getElementById('toggle-safe-mode')?.checked);
}

