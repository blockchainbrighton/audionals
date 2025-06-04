import { decodeAudioData } from "../audio/decode.js";
self.onmessage = async ({ data }) => {
  try {
    const buffer = await decodeAudioData(data.arrayBuffer);
    self.postMessage(buffer, [buffer]);
  } catch (e) {
    self.postMessage({ err: e.message });
  }
};
