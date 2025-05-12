````markdown
# 🚀 Building Custom Modules for the Modular Synth  
*“Patch cables at the ready—let’s make some noise!”*  

## TL;DR (Quick-Start)
1. **Create your file**  
   `js/modules/chorus.js`
2. **Export a creator**  
   ```js
   export function createChorusModule(audioCtx, parentEl, id) { /* … */ }
````

3. **Register it** in **`js/modules/index.js`**

   ```js
   chorus: {
     create: (ctx, el, id) => import('./chorus.js')
       .then(m => m.createChorusModule(ctx, el, id)),
     hasIn: true,  hasOut: true,
     hasTriggerIn: false, hasTriggerOut: false,
     lfoTargets: { rate: 'lfo.frequency', depth: 'lfoGain.gain' }
   }
   ```

That’s it—your module now appears in the UI, wires up in the audio graph, and can even be modulated by an external LFO. 🎛️

---

## 1  Core Architecture

| Piece             | Location                | What it does                                                                                        |
| ----------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| **`MODULE_DEFS`** | `js/modules/index.js`   | Central registry + metadata                                                                         |
| **Factory**       | `js/modules/factory.js` | `createModule(type, …)` looks up `MODULE_DEFS`, lazy-imports the module, returns its **moduleData** |
| **Module file**   | `js/modules/<type>.js`  | Exports `create<Type>Module()`—builds audio nodes, UI, returns moduleData                           |

---

## 2  Writing `create<Type>Module`

```js
export function createChorusModule(audioCtx, parent, id) {
  // ① Audio graph
  const input  = audioCtx.createGain();        // entry
  const delay  = audioCtx.createDelay();
  const lfo    = audioCtx.createOscillator();
  const depth  = audioCtx.createGain();
  const output = audioCtx.createGain();        // exit

  input.connect(output);          // dry
  input.connect(delay); delay.connect(output); // wet
  lfo.connect(depth).connect(delay.delayTime);
  lfo.frequency.value = 0.5; lfo.start();

  // ② UI (tiny example)
  const rate = slider('Rate (Hz)', 0.1, 5, 0.5, v => lfo.frequency.value = v);
  parent.append(rate);

  // ③ Return the module instance
  input.gain.value = 0;           // silence direct pass-through
  output.connect(input);          // route processed signal back to input ➜ single I/O node
  return { id, audioNode: input, lfo, depth };
}
```

<details>
<summary>Helper: <code>slider()</code></summary>

```js
function slider(label, min, max, val, onInput) {
  const wrap = document.createElement('label');
  wrap.textContent = `${label}: `;
  const s = Object.assign(document.createElement('input'),
    { type:'range', min, max, step:(max-min)/100, value:val });
  s.oninput = () => onInput(parseFloat(s.value));
  wrap.append(s);
  return wrap;
}
```

</details>

### What **must** be returned

| Key           | Required? | Purpose                                                                  |
| ------------- | --------- | ------------------------------------------------------------------------ |
| `audioNode`   | ✔️        | Node the factory daisy-chains (`prev.audioNode.connect(next.audioNode)`) |
| Anything else | ❓         | Expose params, helpers, cleanup (`dispose()`) as you like                |

---

## 3  `MODULE_DEFS` Cheat-Sheet

| Prop                  | Type                   | Why                                 |
| --------------------- | ---------------------- | ----------------------------------- |
| `create(ctx, el, id)` | **Function → Promise** | Async import & invoke creator       |
| `hasIn / hasOut`      | `boolean`              | Audio I/O presence                  |
| `hasTriggerIn / Out`  | `boolean`              | Trigger jack presence               |
| `lfoTargets`          | `object \| null`       | `{ uiLabel: 'path.to.AudioParam' }` |

> **Tip:** The string path is resolved on the returned moduleData object, so expose any internal nodes you want to wiggle with an LFO.

---

## 4  Module Types at a Glance

| Type                              | Typical Flags                     | Example                         |
| --------------------------------- | --------------------------------- | ------------------------------- |
| **Source** (Osc, Sampler, LFO)    | `hasIn: false`, `hasOut: true`    | `audioNode ⇒ oscillator`        |
| **Effect** (Gain, Filter, Chorus) | `hasIn: true`, `hasOut: true`     | `audioNode ⇒ BiquadFilterNode`  |
| **Utility** (Sequencer, Clock)    | `hasIn/Out: false`, triggers vary | `moduleData.connectTrigger(cb)` |

---

## 5  Best Practices 🍺

* **Encapsulate:** Keep UI + audio logic inside the creator; expose only what the app needs.
* **Be explicit:** Unique DOM IDs (`${id}-rate`), clear console logs, readable names.
* **Mind the GC:** If you `start()` or add event listeners, return `dispose()` to tidy up.
* **Keep it light:** A synth can host dozens of modules—avoid heavy DOM updates per frame.
* **Test in isolation:** Each module should run happily even if it’s the only thing patched in.

---

## 6  Need Modulation?

Expose the AudioParams you wish to target:

```js
return {
  audioNode: input,
  lfo, depth,                 // expose internals
  paramsForLfo: {             // optional convenience blob
    rate: lfo.frequency,
    depth: depth.gain
  }
};
```

Then in `MODULE_DEFS`:

```js
lfoTargets: { rate: 'paramsForLfo.rate', depth: 'paramsForLfo.depth' }
```

---

## 7  Cleaning Up

```js
return {
  audioNode: input,
  dispose() {
    lfo.stop(); lfo.disconnect();
    parent.replaceChildren(); // nuke UI
    console.log(`[Chorus ${id}] disposed`);
  }
};
```

The host app calls `dispose()` when the user un-patches your module.

---

### 🎉 That’s All, Folks!

Fork it, patch it, and let the bleep-bloops flow. Questions? Open an issue, start a thread, or just plug in another cable and see what happens. Happy modding! 🎛️

```
```
