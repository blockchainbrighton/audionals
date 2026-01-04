export function parseContractId(input) {
  const cleaned = String(input || '').replace(/\s/g, '');
  const parts = cleaned.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid Address Format. Expected: ADDRESS.CONTRACT_NAME');
  }
  return { address: parts[0], name: parts[1], contractId: `${parts[0]}.${parts[1]}` };
}

let lastLoggedContractId = null;

export function getContractDetailsFromUi({ inputId = 'contract-address-input', journeyLog } = {}) {
  const raw = document.getElementById(inputId)?.value;
  try {
    const parsed = parseContractId(raw);
    if (journeyLog && parsed.contractId !== lastLoggedContractId) {
      journeyLog('Contract details parsed', parsed);
      lastLoggedContractId = parsed.contractId;
    }
    return parsed;
  } catch (e) {
    journeyLog?.('ERROR: Invalid contract address format', { input: raw });
    throw e;
  }
}
