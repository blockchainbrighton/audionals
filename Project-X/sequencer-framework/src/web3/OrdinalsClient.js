/**
 * OrdinalsClient encapsulates interactions with the Bitcoin ordinals
 * protocol. It can fetch inscribed assets, list available libraries,
 * upload new assets and resolve library identifiers. Real network
 * calls are abstracted behind the fetchFn supplied to the
 * constructor and can be mocked in tests. Decompression of
 * Brotli/gzip encoded content is not implemented here.
 */
class OrdinalsClient {
  constructor(fetchFn) {
    this.fetchFn = fetchFn;
  }

  /**
   * Fetch an inscription by its identifier. Returns a promise that
   * resolves with a Uint8Array representing the decoded content.
   */
  async fetchInscription(id) {
    if (!this.fetchFn) {
      // Without a fetch function we cannot retrieve network
      // resources. Return an empty buffer.
      return new Uint8Array();
    }
    const result = await this.fetchFn(id);
    // If the result is already a Uint8Array assume it is decoded
    if (result instanceof Uint8Array) {
      return result;
    }
    // Otherwise attempt to convert strings or buffers to Uint8Array
    if (typeof result === 'string') {
      const encoder = new TextEncoder();
      return encoder.encode(result);
    }
    return new Uint8Array(result);
  }

  /**
   * Return a list of available libraries. In the stub
   * implementation this always returns an empty array.
   */
  async listAvailableLibraries() {
    return [];
  }

  /**
   * Upload an asset and return a newly generated inscription ID.
   * The content type metadata is ignored in this stub. A random
   * identifier is generated each time.
   */
  async uploadAsset(assetBytes, metadata) {
    const rand = Math.random().toString(36).slice(2);
    return `inscription-id-${rand}`;
  }

  /**
   * Resolve a library by name and version. Returns a deterministic
   * identifier based on the inputs.
   */
  async resolveLibrary(name, version) {
    return `library-id-${name}-${version}`;
  }
}

module.exports = OrdinalsClient;