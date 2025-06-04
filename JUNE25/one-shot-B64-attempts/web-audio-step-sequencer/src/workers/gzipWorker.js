/* eslint-disable no-restricted-globals */
import { gzip, ungzip } from "pako";
self.onmessage = ({ data }) => {
  const { cmd, payload } = data;
  try {
    if (cmd === "compress") {
      const result = gzip(payload, { to: "string" });
      self.postMessage({ ok: true, result });
    } else if (cmd === "decompress") {
      const result = ungzip(payload, { to: "string" });
      self.postMessage({ ok: true, result });
    }
  } catch (err) {
    self.postMessage({ ok: false, err: err.message });
  }
};
