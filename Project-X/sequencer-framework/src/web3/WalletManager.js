/**
 * WalletManager is a minimal abstraction over wallet key
 * management and transaction signing. It generates simple
 * identifiers for keys and addresses and stubs out inscription
 * creation. In a production setting this would interface with
 * micro‑ordinals and a taproot signer.
 */
class WalletManager {
  constructor() {
    this.keys = [];
  }

  /**
   * Create a new key and store it internally. Returns the key
   * identifier.
   */
  createKey() {
    const key = `key-${Math.random().toString(36).slice(2)}`;
    this.keys.push(key);
    return key;
  }

  /**
   * Return a pseudo random address. In a real implementation this
   * would derive from the stored keys.
   */
  getAddress() {
    return `address-${Math.random().toString(36).slice(2)}`;
  }

  /**
   * Simulate creating an inscription. Returns a fake transaction
   * identifier.
   */
  async inscribe(data, contentType) {
    return `txid-${Math.random().toString(36).slice(2)}`;
  }

  /**
   * Sign a transaction. The signature is a random string in this
   * stub. In practice this would perform ECDSA/Taproot signing.
   */
  signTransaction(tx) {
    return `signature-${Math.random().toString(36).slice(2)}`;
  }
}

module.exports = WalletManager;