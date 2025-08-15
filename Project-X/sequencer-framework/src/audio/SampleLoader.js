const Tone = require('../tone');

/**
 * SampleLoader is responsible for fetching audio assets and
 * instantiating Tone.Player or Tone.Sampler objects from them. It
 * caches decoded buffers so that multiple invocations do not
 * repeatedly fetch or decode the same data. Decompression of
 * Brotli/gzip encoded assets would normally occur here; however
 * within this stubbed environment we simply return the raw data.
 */
class SampleLoader {
  constructor() {
    this.cache = new Map();
    // Allows tests to override the fetch implementation
    this.fetchFn = null;
  }

  /**
   * Fetch a single sample from a URL or inscription identifier.
   * Returns a Promise which resolves with a Tone.Player instance
   * connected to the destination. When possible, the decoded
   * buffer is cached.
   *
   * @param {string|number} urlOrInscriptionId
   */
  async loadSample(urlOrInscriptionId) {
    if (this.cache.has(urlOrInscriptionId)) {
      return this.cache.get(urlOrInscriptionId);
    }
    // Fetch raw binary data. In a browser you might use fetch();
    // here we delegate to an overridable fetchFn for tests.
    let data;
    if (this.fetchFn) {
      data = await this.fetchFn(urlOrInscriptionId);
    } else {
      // Fallback: treat the source as the buffer itself
      data = urlOrInscriptionId;
    }
    // Decompression and decoding would take place here. For the
    // purposes of our stub we simply pass the data through.
    const player = new Tone.Player({ url: data }).connect(Tone.destination);
    this.cache.set(urlOrInscriptionId, player);
    return player;
  }

  /**
   * Load a collection of multisamples. The mapping argument
   * associates note names with sample sources. Returns a
   * Tone.Sampler instance connected to the destination.
   *
   * @param {Object} mapping
   */
  async loadMultiSample(mapping) {
    // In a real implementation you would fetch each sample and
    // construct an appropriate object map. For this stub we simply
    // pass the mapping through to the Tone.Sampler constructor.
    const sampler = new Tone.Sampler(mapping).connect(Tone.destination);
    return sampler;
  }
}

module.exports = SampleLoader;