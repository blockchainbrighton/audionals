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
if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.buffer !== wasm.memory.buffer) {
cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
}
return cachedFloat32ArrayMemory0;
}
let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.buffer !== wasm.memory.buffer) {
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
function bytesToHex(u8) {
let out = '';
const n = u8.length >>> 0;
for (let i = 0; i < n; i++) {
const b = u8[i] & 0xff;
out += b.toString(16).padStart(2, '0');
}
return out;
}
function safeGetStringFromWasm(ptr, len) {
ptr = ptr >>> 0;
len = len >>> 0;
const MAX_LEN = 1024;
const safeLen = Math.min(len, MAX_LEN);
let msg = '';
try {
msg = getStringFromWasm0(ptr, safeLen);
} catch (e) {
const preview = getUint8ArrayMemory0().subarray(ptr, ptr + Math.min(safeLen, 64));
return `WASM throw decode failed (ptr=${ptr} len=${len}) err=${e} hex=${bytesToHex(preview)}`;
}
let nulCount = 0;
for (let i = 0; i < msg.length; i++) if (msg.charCodeAt(i) === 0) nulCount++;
if (msg.length > 0 && (nulCount / msg.length) > 0.5) {
const preview = getUint8ArrayMemory0().subarray(ptr, ptr + Math.min(safeLen, 64));
return `WASM throw (ptr=${ptr} len=${len}) decoded_nuls=${nulCount}/${msg.length} hex=${bytesToHex(preview)}`;
}
if (len > MAX_LEN) msg += `…(truncated, len=${len})`;
return msg;
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
const ptr = this.__destroy_into_raw();
wasm.__wbg_bvstsynth_free(ptr, 0);
}
static new(sample_rate) {
const ret = wasm.bvstsynth_new(sample_rate);
return BvstSynth.__wrap(ret);
}
set_param(id, value) {
const pid = Number(id);
const pval = Number(value);
if (!Number.isFinite(pid) || !Number.isFinite(pval)) return;
wasm.bvstsynth_set_param(this.__wbg_ptr, pid >>> 0, pval);
}
process(in_l, in_r, output_l, output_r) {
if (!wasm.bvstsynth_process) return;
const malloc = getWasmMalloc();
if (typeof malloc !== 'function') return;
const ptr0 = passArrayF32ToWasm0(in_l, malloc);
const len0 = WASM_VECTOR_LEN;
const ptr1 = passArrayF32ToWasm0(in_r, malloc);
const len1 = WASM_VECTOR_LEN;
const ptr2 = passArrayF32ToWasm0(output_l, malloc);
const len2 = WASM_VECTOR_LEN;
const ptr3 = passArrayF32ToWasm0(output_r, malloc);
const len3 = WASM_VECTOR_LEN;
wasm.bvstsynth_process(
this.__wbg_ptr,
ptr0, len0,
ptr1, len1,
ptr2, len2, addHeapObject(output_l),
ptr3, len3, addHeapObject(output_r)
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
const n = Number(note);
const v = Number(velocity);
if (!Number.isFinite(n) || !Number.isFinite(v)) return;
wasm.bvstsynth_note_on(this.__wbg_ptr, n, v);
}
}
note_off(note) {
if (wasm.bvstsynth_note_off) {
const n = Number(note);
if (!Number.isFinite(n)) return;
wasm.bvstsynth_note_off(this.__wbg_ptr, n);
}
}
midi_cc(cc, value) {
if (wasm.bvstsynth_midi_cc) {
const c = Number(cc);
const v = Number(value);
if (!Number.isFinite(c) || !Number.isFinite(v)) return;
wasm.bvstsynth_midi_cc(this.__wbg_ptr, c, v);
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
throw new Error(safeGetStringFromWasm(arg0, arg1));
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
this._reportedWorkletError = false;
this._eventQueue = [];
this._queueReadIndex = 0;
this._maxQueuedEvents = 2048;
this._maxEventsPerBlock = 256;
if (globalThis.BVST_DEBUG) console.log("BVST: Processor constructed.");
}
_reportWorkletError(context, e) {
if (this._reportedWorkletError) return;
this._reportedWorkletError = true;
const msg = (e && e.message) ? e.message : String(e);
console.error(`BVST: Worklet error (${context})`, e);
try {
this.port.postMessage({ type: 'ERROR', error: `${context}: ${msg}` });
} catch (_) {}
}
_enqueueEvent(data) {
if (!data || typeof data.type !== 'string') return;
this._eventQueue.push(data);
const overflow = this._eventQueue.length - this._maxQueuedEvents;
if (overflow > 0) {
this._eventQueue.splice(0, overflow);
this._queueReadIndex = Math.max(0, this._queueReadIndex - overflow);
}
}
_drainEventQueue() {
if (!this.synth) return;
const queue = this._eventQueue;
let idx = this._queueReadIndex;
const end = queue.length;
let processed = 0;
while (idx < end && processed < this._maxEventsPerBlock) {
const evt = queue[idx++];
processed++;
try {
if (evt.type === 'PARAM') {
this.synth.set_param(evt.id, evt.value);
} else if (evt.type === 'GET_DESCRIPTOR') {
if (typeof BvstSynth?.get_descriptor === 'function') {
this.port.postMessage({ type: 'DESCRIPTOR', descriptor: BvstSynth.get_descriptor() });
}
} else if (evt.type === 'GET_STATE') {
if (typeof this.synth.get_state === 'function') {
this.port.postMessage({ type: 'STATE', state: this.synth.get_state() });
}
} else if (evt.type === 'SET_STATE') {
if (typeof this.synth.set_state === 'function') {
this.synth.set_state(evt.state);
}
} else if (evt.type === 'LOAD_SAMPLE') {
if (typeof this.synth.load_sample === 'function') {
this.synth.load_sample(evt.samples);
this.port.postMessage({ type: 'STATUS', msg: "Sample Loaded" });
}
} else if (evt.type === 'NOTE_ON') {
if (typeof this.synth.note_on === 'function') {
const note = Number(evt.note);
const velocity = Number(evt.velocity);
if (Number.isFinite(note) && Number.isFinite(velocity)) {
this.synth.note_on(note, velocity);
}
}
} else if (evt.type === 'NOTE_OFF') {
if (typeof this.synth.note_off === 'function') {
const note = Number(evt.note);
if (Number.isFinite(note)) {
this.synth.note_off(note);
}
}
} else if (evt.type === 'MIDI_CC') {
if (typeof this.synth.midi_cc === 'function') {
const cc = Number(evt.cc);
const value = Number(evt.value);
if (Number.isFinite(cc) && Number.isFinite(value)) {
this.synth.midi_cc(cc, value);
}
}
}
} catch (e) {
this._reportWorkletError(evt.type, e);
}
}
this._queueReadIndex = idx;
if (this._queueReadIndex > 0 && this._queueReadIndex >= queue.length) {
queue.length = 0;
this._queueReadIndex = 0;
} else if (this._queueReadIndex > 0 && this._queueReadIndex > 256) {
queue.splice(0, this._queueReadIndex);
this._queueReadIndex = 0;
}
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
const srCandidate =
(typeof sampleRate === 'number' && Number.isFinite(sampleRate) && sampleRate > 0)
? sampleRate
: (typeof globalThis !== 'undefined' &&
typeof globalThis.sampleRate === 'number' &&
Number.isFinite(globalThis.sampleRate) &&
globalThis.sampleRate > 0)
? globalThis.sampleRate
: 48000;
this.synth = BvstSynth.new(srCandidate);
if (globalThis.BVST_DEBUG) console.log("BVST: BvstSynth instantiated.");
} else {
throw new Error("BvstSynth class not found in WASM exports.");
}
this.port.postMessage({ type: 'READY' });
} catch (e) {
console.error("BVST: Init error", e);
this.port.postMessage({ type: 'ERROR', error: e.toString() });
}
} else {
this._enqueueEvent(event.data);
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
this._drainEventQueue();
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
this._reportWorkletError('PROCESS', e);
try { this.synth.free?.(); } catch (_) {}
this.synth = null;
this._eventQueue.length = 0;
this._queueReadIndex = 0;
return true;
}
}
return true;
}
}
registerProcessor('bvst-processor', BvstProcessor);