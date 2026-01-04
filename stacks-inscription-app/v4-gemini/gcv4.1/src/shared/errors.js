export function getErrorMessage(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || error.name || 'Error';
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

