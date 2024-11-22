// audioLoader.js
export const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const sampleCache = new Map();

/**
 * Loads and decodes an audio sample.
 * @param {object} sample - The sample object containing URL and metadata.
 * @returns {Promise<AudioBuffer|null>} - The decoded audio buffer or null if failed.
 */
export async function loadSample(sample) {
  if (sampleCache.has(sample.id)) {
    return sampleCache.get(sample.id);
  }

  try {
    const response = await fetch(sample.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch sample: ${sample.url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    sampleCache.set(sample.id, audioBuffer);

    // Store the audio buffer duration in the sample for later use
    sample.audioBufferDuration = audioBuffer.duration;

    return audioBuffer;
  } catch (error) {
    console.error('Error loading sample:', error);
    return null;
  }
}