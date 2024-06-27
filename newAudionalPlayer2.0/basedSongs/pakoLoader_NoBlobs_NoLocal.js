// pakoLoader_NoBlobs.js

const keyMap = {
    0: "projectName", 1: "artistName", 2: "projectBPM", 3: "currentSequence", 4: "channelURLs",
    5: "channelVolume", 6: "channelPlaybackSpeed", 7: "trimSettings", 8: "projectChannelNames",
    9: "startSliderValue", 10: "endSliderValue", 11: "totalSampleDuration", 12: "start",
    13: "end", 14: "projectSequences", 15: "steps"
  };
  const reverseKeyMap = Object.fromEntries(Object.entries(keyMap).map(([e, r]) => [r, +e]));
  const channelMap = Array.from({ length: 26 }, (e, r) => String.fromCharCode(65 + r));
  const reverseChannelMap = Object.fromEntries(channelMap.map((e, r) => [e, r]));
  const decompressSteps = e => e.flatMap(e => {
    if ("number" == typeof e) return e;
    if ("object" == typeof e && "r" in e) {
      const [r, t] = e.r;
      return Array.from({ length: t - r + 1 }, (e, t) => r + t);
    }
    return "string" == typeof e && e.endsWith("r") ? { index: parseInt(e.slice(0, -1), 10), reverse: !0 } : void 0;
  });
  const deserialize = e => {
    const r = e => Array.isArray(e) ? e.map(e => "object" == typeof e ? r(e) : e) : "object" == typeof e && null !== e ? Object.entries(e).reduce((e, [t, n]) => {
      const a = keyMap[t] ?? t;
      return e[a] = "projectSequences" === a ? Object.entries(n).reduce((e, [r, t]) => (e[r.replace("s", "Sequence")] = Object.entries(t).reduce((e, [r, t]) => {
        var n;
        return e[`ch${reverseChannelMap[r]}`] = { steps: (n = t[reverseKeyMap.steps] || [], n.flatMap(e => {
          if ("number" == typeof e) return e;
          if ("object" == typeof e && "r" in e) {
            const [r, t] = e.r;
            return Array.from({ length: t - r + 1 }, (e, t) => r + t);
          }
          return "string" == typeof e && e.endsWith("r") ? { index: parseInt(e.slice(0, -1), 10), reverse: !0 } : void 0;
        })) }, e;
      }, {}), e), {}): r(n), e;
    }, {}) : e;
    return r(e);
  };
  const loadPako = async () => {
    try {
      const e = await fetch("https://ordinals.com/content/2109694f44c973892fb8152cf5c68607fb19288c045af1abc1716c1c3b4d69e6i0"), r = await e.text(), t = document.createElement("div");
      t.innerHTML = r;
      const n = t.querySelectorAll("script"), a = Array.from(n).find(e => e.textContent.includes("pako"));
      if (!a) throw new Error("Pako library not found in the HTML content.");
      const o = document.createElement("script");
      o.textContent = a.textContent, document.head.appendChild(o), console.log("Pako library loaded:", pako);
    } catch (e) {
      console.error("Error loading Pako:", e);
    }
  };
  const processSerializedData = async e => {
    try {
      await loadPako();
      const r = await fetch(e);
      if (!r.ok) throw new Error("Network response was not ok");
      const t = await r.arrayBuffer(), n = pako.inflate(new Uint8Array(t)), a = new TextDecoder("utf-8").decode(n), o = JSON.parse(a), c = deserialize(o);
      console.log("Deserialized Data:", c);
  
      // Store the deserialized data in a global variable
      window.jsonData = c;
  
      // Dynamically load the next script
      const s = document.createElement("script");
      s.src = "songLoaderConfig_B_NoBlobs.js";
      document.head.appendChild(s);
    } catch (e) {
      console.error("Error processing data:", e);
    }
  };
  const getJsonData = () => {
    if (window.jsonData) {
      return window.jsonData;
    } else {
      console.error("No data found in memory");
      return null;
    }
  };
  