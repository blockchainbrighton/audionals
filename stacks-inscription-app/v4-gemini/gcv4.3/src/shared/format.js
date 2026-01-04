export const MICROSTX_PER_STX = 1_000_000;

export function formatMicroStx(microStx) {
  return `${(microStx / MICROSTX_PER_STX).toFixed(6)} STX`;
}

export function formatInt(n) {
  return new Intl.NumberFormat().format(n);
}

