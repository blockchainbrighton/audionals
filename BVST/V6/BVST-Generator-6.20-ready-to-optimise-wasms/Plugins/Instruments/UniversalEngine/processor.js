let wasm;
function addHeapObject(obj) {
if (heap_next === heap.length) heap.push(heap.length + 1);
const idx = heap_next;
heap_next = heap[idx];
heap[idx] = obj;
return idx;
}
function dropObject(idx) {
if (idx < 132) return;
heap[idx] = heap_next;
heap_next = idx;
}
function getArrayU8FromWasm0(ptr, len) {
ptr = ptr >>> 0;
return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}
let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
}
return cachedFloat32ArrayMemory0;
}
function getStringFromWasm0(ptr, len) {
ptr = ptr >>> 0;
return decodeText(ptr, len);
}
let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
}
return cachedUint8ArrayMemory0;
}
function getObject(idx) { return heap[idx]; }
let heap = new Array(128).fill(undefined);
heap.push(undefined, null, true, false);
let heap_next = heap.length;
function passArrayF32ToWasm0(arg, malloc) {
const ptr = malloc(arg.length * 4, 4) >>> 0;
getFloat32ArrayMemory0().set(arg, ptr / 4);
WASM_VECTOR_LEN = arg.length;
return ptr;
}
function takeObject(idx) {
const ret = getObject(idx);
dropObject(idx);
return ret;
}
let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
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
let WASM_VECTOR_LEN = 0;
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
process(output) {
var ptr0 = passArrayF32ToWasm0(output, wasm.__wbindgen_export);
var len0 = WASM_VECTOR_LEN;
wasm.bvstsynth_process(this.__wbg_ptr, ptr0, len0, addHeapObject(output));
}
set_param(id, value) {
wasm.bvstsynth_set_param(this.__wbg_ptr, id, value);
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
console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
} else {
throw e;
}
}
}
const bytes = await module.arrayBuffer();
return await WebAssembly.instantiate(bytes, imports);
} else {
const instance = await WebAssembly.instantiate(module, imports);
if (instance instanceof WebAssembly.Instance) {
return { instance, module };
} else {
return instance;
}
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
function initSync(module) {
if (wasm !== undefined) return wasm;
if (typeof module !== 'undefined') {
if (Object.getPrototypeOf(module) === Object.prototype) {
({module} = module)
} else {
console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
}
}
const imports = __wbg_get_imports();
if (!(module instanceof WebAssembly.Module)) {
module = new WebAssembly.Module(module);
}
const instance = new WebAssembly.Instance(module, imports);
return __wbg_finalize_init(instance, module);
}
async function __wbg_init(module_or_path) {
if (wasm !== undefined) return wasm;
if (typeof module_or_path !== 'undefined') {
if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
({module_or_path} = module_or_path)
} else {
console.warn('using deprecated parameters for the initialization function; pass a single object instead')
}
}
if (typeof module_or_path === 'undefined') {
module_or_path = new URL('bvst_engine_bg.wasm', import.meta.url);
}
const imports = __wbg_get_imports();
if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
module_or_path = fetch(module_or_path);
}
const { instance, module } = await __wbg_load(await module_or_path, imports);
return __wbg_finalize_init(instance, module);
}
export { initSync };
export default __wbg_init;
class BvstProcessor extends AudioWorkletProcessor {
constructor() {
super();
this.synth = null;
this.port.onmessage = this.handleMessage.bind(this);
this.dummyInput = new Float32Array(128);
console.log("BVST: Processor constructed.");
}
async handleMessage(event) {
if (event.data.type === 'INIT_WASM') {
console.log("BVST: Initializing WASM...");
try {
const wasmInit = (typeof init !== 'undefined') ? init : (typeof __wbg_init !== 'undefined' ? __wbg_init : null);
if (!wasmInit) {
throw new Error("WASM init function not found (expected 'init' or '__wbg_init').");
}
await wasmInit(event.data.wasmBytes);
if (typeof BvstSynth !== 'undefined') {
this.synth = BvstSynth.new(sampleRate);
console.log("BVST: BvstSynth instantiated.");
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