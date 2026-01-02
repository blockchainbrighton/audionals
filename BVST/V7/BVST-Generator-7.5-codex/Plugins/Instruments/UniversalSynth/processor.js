let wasm;
const heap = new Array(128).fill(undefined);
heap.push(undefined, null, true, false);
let heap_next = heap.length;
function addHeapObject(obj) {
if (heap_next === heap.length) heap.push(heap.length + 1);
const idx = heap_next;
heap_next = heap[idx];
heap[idx] = obj;
return idx;
}
function getObject(idx) { return heap[idx]; }
function dropObject(idx) {
if (idx < 132) return;
heap[idx] = heap_next;
heap_next = idx;
}
function takeObject(idx) {
const ret = getObject(idx);
dropObject(idx);
return ret;
}
let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
}
return cachedFloat32ArrayMemory0;
}
let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
}
return cachedUint8ArrayMemory0;
}
function getArrayU8FromWasm0(ptr, len) {
ptr = ptr >>> 0;
return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}
let cachedTextDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => 'TextDecoder missing' };
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
numBytesDecoded += len;
if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
numBytesDecoded = len;
}
return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}
function getStringFromWasm0(ptr, len) {
ptr = ptr >>> 0;
return decodeText(ptr, len);
}
let WASM_VECTOR_LEN = 0;
function passArrayF32ToWasm0(arg, malloc) {
const ptr = malloc(arg.length * 4, 4) >>> 0;
getFloat32ArrayMemory0().set(arg, ptr / 4);
WASM_VECTOR_LEN = arg.length;
return ptr;
}
function getWasmMalloc() {
if (typeof wasm?.__wbindgen_malloc === 'function') return wasm.__wbindgen_malloc;
if (typeof wasm?.__wbindgen_export === 'function') return wasm.__wbindgen_export;
if (typeof wasm?.__wbindgen_export2 === 'function') return wasm.__wbindgen_export2;
return null;
}
function getWasmFree() {
if (typeof wasm?.__wbindgen_free === 'function') return wasm.__wbindgen_free;
if (typeof wasm?.__wbindgen_export === 'function') return wasm.__wbindgen_export;
return null;
}
const BvstSynthFinalization = (typeof FinalizationRegistry === 'undefined')
? { register: () => {}, unregister: () => {} }
: new FinalizationRegistry(ptr => wasm.__wbg_bvstsynth_free(ptr >>> 0, 1));
export class BvstSynth {
static __wrap(ptr) {
ptr = ptr >>> 0;
const obj = Object.create(BvstSynth.prototype);
obj.__wbg_ptr = ptr;
BvstSynthFinalization.register(obj, obj.__wbg_ptr, obj);
return obj;
}
__destroy_into_raw() {
const ptr = this.__wbg_ptr;
this.__wbg_ptr = 0;
BvstSynthFinalization.unregister(this);
return ptr;
}
free() {
if (this._scratch && this._scratch.cap && this._scratch.ptrs) {
const free = getWasmFree();
if (typeof free === 'function') {
const bytes = this._scratch.cap * 4;
try { free(this._scratch.ptrs.inL, bytes, 4); } catch (_) {}
try { free(this._scratch.ptrs.inR, bytes, 4); } catch (_) {}
try { free(this._scratch.ptrs.outL, bytes, 4); } catch (_) {}
try { free(this._scratch.ptrs.outR, bytes, 4); } catch (_) {}
}
}
const ptr = this.__destroy_into_raw();
wasm.__wbg_bvstsynth_free(ptr, 0);
}
static new(sample_rate) {
const ret = wasm.bvstsynth_new(sample_rate);
return BvstSynth.__wrap(ret);
}
set_param(id, value) {
wasm.bvstsynth_set_param(this.__wbg_ptr, id, value);
}
process(in_l, in_r, output_l, output_r) {
if (!wasm.bvstsynth_process) return;
const len = output_l.length >>> 0;
const malloc = getWasmMalloc();
if (typeof malloc !== 'function') return;
if (!this._scratch || this._scratch.cap < len) {
const cap = Math.max(128, len);
this._scratch = {
cap,
ptrs: {
inL: (malloc(cap * 4, 4) >>> 0),
inR: (malloc(cap * 4, 4) >>> 0),
outL: (malloc(cap * 4, 4) >>> 0),
outR: (malloc(cap * 4, 4) >>> 0)
}
};
}
const mem = getFloat32ArrayMemory0();
const { inL, inR, outL, outR } = this._scratch.ptrs;
mem.subarray(inL / 4, inL / 4 + len).set(in_l);
mem.subarray(inR / 4, inR / 4 + len).set(in_r);
wasm.bvstsynth_process(
this.__wbg_ptr,
inL, len,
inR, len,
outL, len, addHeapObject(output_l),
outR, len, addHeapObject(output_r)
);
}
static get_descriptor() {
if (!wasm.bvstsynth_get_descriptor) return "{}";
const malloc = wasm.__wbindgen_export || wasm.__wbindgen_export2 || wasm.__wbindgen_malloc;
const free = wasm.__wbindgen_export || wasm.__wbindgen_free;
const retptr = malloc(16, 4);
try {
wasm.bvstsynth_get_descriptor(retptr);
const mem = new Int32Array(wasm.memory.buffer);
const r0 = mem[retptr / 4 + 0];
const r1 = mem[retptr / 4 + 1];
return getStringFromWasm0(r0, r1);
} finally {
if (free) free(retptr, 16, 4);
}
}
get_state() {
if (!wasm.bvstsynth_get_state) return new Float32Array(0);
const malloc = wasm.__wbindgen_export || wasm.__wbindgen_export2 || wasm.__wbindgen_malloc;
const free = wasm.__wbindgen_export || wasm.__wbindgen_free;
const retptr = malloc(16, 4);
try {
wasm.bvstsynth_get_state(retptr, this.__wbg_ptr);
const mem = new Int32Array(wasm.memory.buffer);
const r0 = mem[retptr / 4 + 0];
const r1 = mem[retptr / 4 + 1];
const v1 = getFloat32ArrayMemory0().subarray(r0 / 4, r0 / 4 + r1).slice();
if (free) free(r0, r1 * 4, 4);
return v1;
} finally {
if (free) free(retptr, 16, 4);
}
}
set_state(state) {
if (!wasm.bvstsynth_set_state) return;
const malloc = wasm.__wbindgen_export || wasm.__wbindgen_export2 || wasm.__wbindgen_malloc;
const ptr0 = passArrayF32ToWasm0(state, malloc);
const len0 = WASM_VECTOR_LEN;
wasm.bvstsynth_set_state(this.__wbg_ptr, ptr0, len0);
}
load_sample(data) {
if (!wasm.bvstsynth_load_sample) {
console.warn("load_sample called but not supported by this plugin.");
return;
}
const malloc = wasm.__wbindgen_export || wasm.__wbindgen_export2 || wasm.__wbindgen_malloc;
const ptr0 = passArrayF32ToWasm0(data, malloc);
const len0 = WASM_VECTOR_LEN;
wasm.bvstsynth_load_sample(this.__wbg_ptr, ptr0, len0);
}
note_on(note, velocity) {
if (wasm.bvstsynth_note_on) {
wasm.bvstsynth_note_on(this.__wbg_ptr, note, velocity);
}
}
note_off(note) {
if (wasm.bvstsynth_note_off) {
wasm.bvstsynth_note_off(this.__wbg_ptr, note);
}
}
midi_cc(cc, value) {
if (wasm.bvstsynth_midi_cc) {
wasm.bvstsynth_midi_cc(this.__wbg_ptr, cc, value);
}
}
}
if (Symbol.dispose) BvstSynth.prototype[Symbol.dispose] = BvstSynth.prototype.free;
const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);
async function __wbg_load(module, imports) {
if (typeof Response === 'function' && module instanceof Response) {
if (typeof WebAssembly.instantiateStreaming === 'function') {
try {
return await WebAssembly.instantiateStreaming(module, imports);
} catch (e) {
const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);
if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
console.warn("Falling back to instantiate");
} else {
throw e;
}
}
}
const bytes = await module.arrayBuffer();
return await WebAssembly.instantiate(bytes, imports);
} else {
const instance = await WebAssembly.instantiate(module, imports);
return (instance instanceof WebAssembly.Instance) ? { instance, module } : instance;
}
}
function __wbg_get_imports() {
const imports = {};
imports.wbg = {};
imports.wbg.__wbg___wbindgen_copy_to_typed_array_db832bc4df7216c1 = function(arg0, arg1, arg2) {
new Uint8Array(getObject(arg2).buffer, getObject(arg2).byteOffset, getObject(arg2).byteLength).set(getArrayU8FromWasm0(arg0, arg1));
};
imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
throw new Error(getStringFromWasm0(arg0, arg1));
};
imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
takeObject(arg0);
};
return imports;
}
function __wbg_finalize_init(instance, module) {
wasm = instance.exports;
__wbg_init.__wbindgen_wasm_module = module;
cachedFloat32ArrayMemory0 = null;
cachedUint8ArrayMemory0 = null;
return wasm;
}
async function __wbg_init(module_or_path) {
if (wasm !== undefined) return wasm;
if (typeof module_or_path === 'undefined') {
module_or_path = new URL('bvst_engine_bg.wasm', import.meta.url);
}
const imports = __wbg_get_imports();
if (module_or_path instanceof WebAssembly.Module) {
const { instance, module } = await __wbg_load(module_or_path, imports);
return __wbg_finalize_init(instance, module);
}
if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
module_or_path = fetch(module_or_path);
}
const { instance, module } = await __wbg_load(await module_or_path, imports);
return __wbg_finalize_init(instance, module);
}
export default __wbg_init;
class BvstProcessor extends AudioWorkletProcessor {
constructor() {
super();
this.synth = null;
this.port.onmessage = this.handleMessage.bind(this);
this.dummyInput = new Float32Array(128);
if (globalThis.BVST_DEBUG) console.log("BVST: Processor constructed.");
}
async handleMessage(event) {
if (event.data.type === 'INIT_WASM') {
if (globalThis.BVST_DEBUG) console.log("BVST: Initializing WASM...");
try {
const wasmInit = (typeof init !== 'undefined') ? init : (typeof __wbg_init !== 'undefined' ? __wbg_init : null);
if (!wasmInit) {
throw new Error("WASM init function not found (expected 'init' or '__wbg_init').");
}
await wasmInit(event.data.wasmBytes);
if (typeof BvstSynth !== 'undefined') {
this.synth = BvstSynth.new(sampleRate);
if (globalThis.BVST_DEBUG) console.log("BVST: BvstSynth instantiated.");
} else {
throw new Error("BvstSynth class not found in WASM exports.");
}
this.port.postMessage({ type: 'READY' });
} catch (e) {
console.error("BVST: Init error", e);
this.port.postMessage({ type: 'ERROR', error: e.toString() });
}
} else if (event.data.type === 'PARAM') {
if (this.synth) {
this.synth.set_param(event.data.id, event.data.value);
}
} else if (event.data.type === 'GET_DESCRIPTOR') {
if (this.synth && typeof BvstSynth.get_descriptor === 'function') {
this.port.postMessage({ type: 'DESCRIPTOR', descriptor: BvstSynth.get_descriptor() });
}
} else if (event.data.type === 'GET_STATE') {
if (this.synth && typeof this.synth.get_state === 'function') {
this.port.postMessage({ type: 'STATE', state: this.synth.get_state() });
}
} else if (event.data.type === 'SET_STATE') {
if (this.synth && typeof this.synth.set_state === 'function') {
this.synth.set_state(event.data.state);
}
} else if (event.data.type === 'LOAD_SAMPLE') {
if (this.synth && typeof this.synth.load_sample === 'function') {
try {
this.synth.load_sample(event.data.samples);
this.port.postMessage({ type: 'STATUS', msg: "Sample Loaded" });
} catch (e) {
console.error("BVST: load_sample failed", e);
this.port.postMessage({ type: 'ERROR', error: "Sample Load Failed: " + e.message });
}
} else {
console.warn("BVST: Received LOAD_SAMPLE but synth does not support it.");
}
} else if (event.data.type === 'NOTE_ON') {
if (globalThis.BVST_DEBUG) console.log(`Processor: NOTE_ON ${event.data.note}`);
if (this.synth && typeof this.synth.note_on === 'function') {
this.synth.note_on(event.data.note, event.data.velocity);
} else {
if (globalThis.BVST_DEBUG) console.warn("Processor: synth.note_on missing or synth not ready");
}
} else if (event.data.type === 'NOTE_OFF') {
if (this.synth && typeof this.synth.note_off === 'function') {
this.synth.note_off(event.data.note);
}
} else if (event.data.type === 'MIDI_CC') {
if (this.synth && typeof this.synth.midi_cc === 'function') {
this.synth.midi_cc(event.data.cc, event.data.value);
}
}
}
process(inputs, outputs, parameters) {
const output = outputs[0];
if (!output || output.length === 0) return true;
let inL = this.dummyInput;
let inR = this.dummyInput;
if (inputs.length > 0 && inputs[0].length > 0) {
inL = inputs[0][0];
if (inputs[0].length > 1) {
inR = inputs[0][1];
} else {
inR = inL;
}
}
const outL = output[0];
const outR = output.length > 1 ? output[1] : null;
if (inL === this.dummyInput && this.dummyInput.length !== outL.length) {
this.dummyInput = new Float32Array(outL.length);
inL = this.dummyInput;
inR = this.dummyInput;
}
if (this.synth) {
try {
if (this.synth.process.length === 4) {
let targetR = outR ? outR : this.dummyInput;
this.synth.process(inL, inR, outL, targetR);
} else if (this.synth.process.length >= 2) {
this.synth.process(inL, outL);
if (outR) outR.set(outL);
} else {
this.synth.process(outL);
if (outR) outR.set(outL);
}
} catch (e) {
return true;
}
}
return true;
}
}
registerProcessor('bvst-processor', BvstProcessor);