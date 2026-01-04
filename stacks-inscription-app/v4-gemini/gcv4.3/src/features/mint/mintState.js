export function createMintState() {
  return {
    currentFileMeta: { name: null, size: 0 },
    currentChunks: [],
    currentRoot: null,
    currentMimeType: 'application/octet-stream',
    currentFileObjectUrl: null,
    lastInscriptionId: null,
  };
}

