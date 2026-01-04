import { ClarityType, hexToCV } from '@stacks/transactions';

function safeHexPrefix(hex, len = 18) {
  if (typeof hex !== 'string') return null;
  const h = hex.startsWith('0x') ? hex : `0x${hex}`;
  return h.length > len ? `${h.slice(0, len)}…` : h;
}

function parseOkUIntFromRepr(repr) {
  const text = String(repr || '');
  const okMatch = text.match(/\(ok u(\d+)\)/);
  if (okMatch?.[1]) return { ok: true, value: Number(okMatch[1]), source: 'repr' };

  const errMatch = text.match(/\(err u(\d+)\)/);
  if (errMatch?.[1]) return { ok: false, kind: 'err_response', errCode: Number(errMatch[1]), source: 'repr' };

  return null;
}

function parseOkUIntFromHex(hex) {
  if (typeof hex !== 'string' || !hex.length) return null;
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex;
  const cv = hexToCV(cleaned);

  if (cv?.type === ClarityType.ResponseOk) {
    const inner = cv.value;
    if (inner?.type === ClarityType.UInt) {
      const n = typeof inner.value === 'bigint' ? Number(inner.value) : Number(inner.value);
      if (!Number.isFinite(n)) return { ok: false, kind: 'not_uint', detail: 'ok response uint is not finite', source: 'hex' };
      return { ok: true, value: n, source: 'hex' };
    }
    return { ok: false, kind: 'not_uint', detail: `ok response is not uint (type ${inner?.type ?? 'unknown'})`, source: 'hex' };
  }

  if (cv?.type === ClarityType.ResponseErr) {
    const inner = cv.value;
    if (inner?.type === ClarityType.UInt) {
      const code = typeof inner.value === 'bigint' ? Number(inner.value) : Number(inner.value);
      return { ok: false, kind: 'err_response', errCode: code, source: 'hex' };
    }
    return { ok: false, kind: 'err_response', errCode: null, source: 'hex' };
  }

  return { ok: false, kind: 'not_response', detail: `tx_result is not a response (type ${cv?.type ?? 'unknown'})`, source: 'hex' };
}

export function summarizeTxResult(txResult) {
  return {
    repr: txResult?.repr ?? null,
    hexPrefix: safeHexPrefix(txResult?.hex ?? null),
    hexLen: typeof txResult?.hex === 'string' ? txResult.hex.length : null,
  };
}

export function parseOkUIntFromTxResult(txResult) {
  const repr = txResult?.repr ?? null;
  const hex = txResult?.hex ?? null;

  const fromRepr = parseOkUIntFromRepr(repr);
  if (fromRepr) return { ...fromRepr, debug: summarizeTxResult(txResult) };

  try {
    const fromHex = parseOkUIntFromHex(hex);
    if (fromHex) return { ...fromHex, debug: summarizeTxResult(txResult) };
  } catch (e) {
    return {
      ok: false,
      kind: 'decode_failed',
      detail: e?.message || String(e),
      source: 'hex',
      debug: summarizeTxResult(txResult),
    };
  }

  return {
    ok: false,
    kind: 'missing',
    detail: 'tx_result missing repr/hex',
    source: 'unknown',
    debug: summarizeTxResult(txResult),
  };
}

