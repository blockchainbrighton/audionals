export function persistLastInscriptionId(mintState, id) {
  mintState.lastInscriptionId = id;
  try {
    localStorage.setItem('last-inscription-id', String(id));
  } catch {
    // ignore
  }
}

export function restoreLastInscriptionId() {
  try {
    const raw = localStorage.getItem('last-inscription-id');
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export function saveInscriptionProgressHint({
  id,
  contractId,
  mintState,
  safeMode,
  rootHex = null,
}) {
  try {
    localStorage.setItem(
      `inscription-progress:${id}`,
      JSON.stringify({
        id,
        contract: contractId,
        fileName: mintState.currentFileMeta?.name || null,
        fileSize: mintState.currentFileMeta?.size || null,
        chunkCount: mintState.currentChunks.length,
        mimeType: mintState.currentMimeType,
        rootHex,
        startedAt: new Date().toISOString(),
        safeMode: Boolean(safeMode),
      })
    );
  } catch {
    // ignore
  }
}

export function persistLastConfirmedChunk(id, chunkIndex) {
  try {
    localStorage.setItem(`inscription-last-confirmed:${id}`, String(chunkIndex));
  } catch {
    // ignore
  }
}
