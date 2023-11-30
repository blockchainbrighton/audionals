var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* src/AudioTrimmer.svelte generated by Svelte v3.59.2 */

    function create_fragment$1(ctx) {
        let h1;
        let t1;
        let input0;
        let t2;
        let button0;
        let t4;
        let div2;
        let canvas0;
        let t5;
        let canvas1;
        let t6;
        let div0;
        let t7;
        let div1;
        let t8;
        let div3;
        let p0;
        let t9;
        let t10;
        let t11;
        let p1;
        let t12;
        let t13;
        let t14;
        let input1;
        let t15;
        let input2;
        let t16;
        let button1;
        let t18;
        let button2;
        let t20;
        let button3;
        let mounted;
        let dispose;

        return {
            c() {
                h1 = element("h1");
                h1.textContent = "Audio Trimmer";
                t1 = space();
                input0 = element("input");
                t2 = space();
                button0 = element("button");
                button0.textContent = "Load Sample";
                t4 = space();
                div2 = element("div");
                canvas0 = element("canvas");
                t5 = space();
                canvas1 = element("canvas");
                t6 = space();
                div0 = element("div");
                t7 = space();
                div1 = element("div");
                t8 = space();
                div3 = element("div");
                p0 = element("p");
                t9 = text("Start Time: ");
                t10 = text(/*formattedStartTime*/ ctx[9]);
                t11 = space();
                p1 = element("p");
                t12 = text("End Time: ");
                t13 = text(/*formattedEndTime*/ ctx[10]);
                t14 = space();
                input1 = element("input");
                t15 = space();
                input2 = element("input");
                t16 = space();
                button1 = element("button");
                button1.textContent = "Play";
                t18 = space();
                button2 = element("button");
                button2.textContent = "Stop";
                t20 = space();
                button3 = element("button");
                button3.textContent = "Loop Selection";
                attr(input0, "type", "text");
                attr(input0, "placeholder", "Enter Ordinal ID");
                attr(canvas0, "width", "4000");
                attr(canvas0, "height", "800");
                attr(canvas0, "class", "waveform-canvas svelte-14j8dif");
                attr(canvas1, "width", "4000");
                attr(canvas1, "height", "800");
                attr(canvas1, "class", "playback-canvas svelte-14j8dif");
                attr(div0, "class", "dimmed svelte-14j8dif");
                set_style(div0, "width", /*startDimmedWidth*/ ctx[5]);
                set_style(div0, "left", "0");
                attr(div1, "class", "dimmed svelte-14j8dif");
                set_style(div1, "width", /*endDimmedWidth*/ ctx[6]);
                set_style(div1, "right", "0");
                set_style(div1, "left", "auto");
                attr(div2, "class", "waveform-container svelte-14j8dif");
                attr(input1, "type", "range");
                attr(input1, "class", "slider svelte-14j8dif");
                attr(input1, "min", "0");
                attr(input1, "max", /*maxDuration*/ ctx[0]);
                attr(input1, "step", "0.01");
                attr(input2, "type", "range");
                attr(input2, "class", "slider svelte-14j8dif");
                attr(input2, "min", "0");
                attr(input2, "max", /*maxDuration*/ ctx[0]);
                attr(input2, "step", "0.01");
                attr(button3, "class", "loop-button svelte-14j8dif");
                toggle_class(button3, "off", !/*isLooping*/ ctx[3]);
                toggle_class(button3, "on", /*isLooping*/ ctx[3]);
            },
            m(target, anchor) {
                insert(target, h1, anchor);
                insert(target, t1, anchor);
                insert(target, input0, anchor);
                set_input_value(input0, /*ordinalId*/ ctx[4]);
                insert(target, t2, anchor);
                insert(target, button0, anchor);
                insert(target, t4, anchor);
                insert(target, div2, anchor);
                append(div2, canvas0);
                /*canvas0_binding*/ ctx[22](canvas0);
                append(div2, t5);
                append(div2, canvas1);
                /*canvas1_binding*/ ctx[23](canvas1);
                append(div2, t6);
                append(div2, div0);
                append(div2, t7);
                append(div2, div1);
                insert(target, t8, anchor);
                insert(target, div3, anchor);
                append(div3, p0);
                append(p0, t9);
                append(p0, t10);
                append(div3, t11);
                append(div3, p1);
                append(p1, t12);
                append(p1, t13);
                insert(target, t14, anchor);
                insert(target, input1, anchor);
                set_input_value(input1, /*$startSliderValue*/ ctx[2]);
                insert(target, t15, anchor);
                insert(target, input2, anchor);
                set_input_value(input2, /*$endSliderValue*/ ctx[1]);
                insert(target, t16, anchor);
                insert(target, button1, anchor);
                insert(target, t18, anchor);
                insert(target, button2, anchor);
                insert(target, t20, anchor);
                insert(target, button3, anchor);

                if (!mounted) {
                    dispose = [
                        listen(input0, "input", /*input0_input_handler*/ ctx[21]),
                        listen(button0, "click", /*loadSample*/ ctx[13]),
                        listen(input1, "change", /*input1_change_input_handler*/ ctx[24]),
                        listen(input1, "input", /*input1_change_input_handler*/ ctx[24]),
                        listen(input2, "change", /*input2_change_input_handler*/ ctx[25]),
                        listen(input2, "input", /*input2_change_input_handler*/ ctx[25]),
                        listen(button1, "click", /*playAudio*/ ctx[15]),
                        listen(button2, "click", /*stopAudio*/ ctx[16]),
                        listen(button3, "click", /*toggleLoop*/ ctx[14])
                    ];

                    mounted = true;
                }
            },
            p(ctx, dirty) {
                if (dirty[0] & /*ordinalId*/ 16 && input0.value !== /*ordinalId*/ ctx[4]) {
                    set_input_value(input0, /*ordinalId*/ ctx[4]);
                }

                if (dirty[0] & /*startDimmedWidth*/ 32) {
                    set_style(div0, "width", /*startDimmedWidth*/ ctx[5]);
                }

                if (dirty[0] & /*endDimmedWidth*/ 64) {
                    set_style(div1, "width", /*endDimmedWidth*/ ctx[6]);
                }

                if (dirty[0] & /*formattedStartTime*/ 512) set_data(t10, /*formattedStartTime*/ ctx[9]);
                if (dirty[0] & /*formattedEndTime*/ 1024) set_data(t13, /*formattedEndTime*/ ctx[10]);

                if (dirty[0] & /*maxDuration*/ 1) {
                    attr(input1, "max", /*maxDuration*/ ctx[0]);
                }

                if (dirty[0] & /*$startSliderValue*/ 4) {
                    set_input_value(input1, /*$startSliderValue*/ ctx[2]);
                }

                if (dirty[0] & /*maxDuration*/ 1) {
                    attr(input2, "max", /*maxDuration*/ ctx[0]);
                }

                if (dirty[0] & /*$endSliderValue*/ 2) {
                    set_input_value(input2, /*$endSliderValue*/ ctx[1]);
                }

                if (dirty[0] & /*isLooping*/ 8) {
                    toggle_class(button3, "off", !/*isLooping*/ ctx[3]);
                }

                if (dirty[0] & /*isLooping*/ 8) {
                    toggle_class(button3, "on", /*isLooping*/ ctx[3]);
                }
            },
            i: noop,
            o: noop,
            d(detaching) {
                if (detaching) detach(h1);
                if (detaching) detach(t1);
                if (detaching) detach(input0);
                if (detaching) detach(t2);
                if (detaching) detach(button0);
                if (detaching) detach(t4);
                if (detaching) detach(div2);
                /*canvas0_binding*/ ctx[22](null);
                /*canvas1_binding*/ ctx[23](null);
                if (detaching) detach(t8);
                if (detaching) detach(div3);
                if (detaching) detach(t14);
                if (detaching) detach(input1);
                if (detaching) detach(t15);
                if (detaching) detach(input2);
                if (detaching) detach(t16);
                if (detaching) detach(button1);
                if (detaching) detach(t18);
                if (detaching) detach(button2);
                if (detaching) detach(t20);
                if (detaching) detach(button3);
                mounted = false;
                run_all(dispose);
            }
        };
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        const hundredths = Math.floor((seconds - Math.floor(seconds)) * 100);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${hundredths}`;
    }

    //  // Function to synchronize with global settings
    //  function syncWithGlobalSettings() {
    //      const currentTrimValues = globalSettings.settings.masterSettings.trimValues[channelIndex];
    //      startSliderValue.set(parseFloat(currentTrimValues.startTrimTime));
    //      endSliderValue.set(parseFloat(currentTrimValues.endTrimTime));
    //  }
    function base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
    }

    function getMinMax(channelData, startIndex, step) {
        let min = 1.0, max = -1.0;

        for (let i = 0; i < step; i++) {
            const datum = channelData[startIndex + i];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }

        return { min, max };
    }

    function instance($$self, $$props, $$invalidate) {
        let $endSliderValue;
        let $startSliderValue;
        let { externalOrdinalId = '' } = $$props;
        let { externalAudioContext } = $$props;
        let { channelIndex } = $$props;

        // Accessing the global object
        // const globalSettings = window.UnifiedSequencerSettings;
        // Internal state managed with Svelte stores
        const startSliderValue = writable(0); // 0% to start

        component_subscribe($$self, startSliderValue, value => $$invalidate(2, $startSliderValue = value));
        const endSliderValue = writable(100); // 100% to end
        component_subscribe($$self, endSliderValue, value => $$invalidate(1, $endSliderValue = value));
        let isLooping = false;

        // Other variables
        let audioContext = externalAudioContext || new (window.AudioContext || window.webkitAudioContext)();

        let audioBuffer, sourceNode, startTime, isPlaying = false;
        let ordinalId = '', maxDuration = 0;
        let startDimmedWidth = '0%', endDimmedWidth = '0%';
        let canvas, playbackCanvas, ctx, playbackCtx;

        // Formatted time for display
        let formattedStartTime = '0:00.00';

        let formattedEndTime = '0:00.00';

        // Sync with global settings on component mount
        onMount(() => {
            if (window.audioTrimmerData) {
                // Use the data from the global object
                const { audioData, trimSettings } = window.audioTrimmerData;

                // Load audio and set initial trim settings
                // Use this data to set up your component
                // For example, load the audio, set initial trim settings, etc.
                loadAudio(audioData);

                setInitialTrimSettings(trimSettings);

                // Clear the global data to avoid reuse
                window.audioTrimmerData = null;
            }

            // syncWithGlobalSettings();
            ctx = canvas.getContext('2d');

            playbackCtx = playbackCanvas.getContext('2d');
        });

        // Ensure disconnection and cleanup on component destruction
        onDestroy(() => {
            if (sourceNode) {
                sourceNode.disconnect();
            }

            audioContext.close();
        });

        function decodeAudioData(audioData) {
            return new Promise((resolve, reject) => {
                    audioContext.decodeAudioData(audioData, resolve, e => reject(new Error(`Decoding audio data failed with error: ${e}`)));
                });
        }

        async function fetchAudio(ordinalId) {
            const url = `https://ordinals.com/content/${ordinalId}`;

            try {
                const response = await fetch(url);
                const contentType = response.headers.get('content-type');
                let arrayBuffer;

                if (contentType && contentType.includes('application/json')) {
                    const jsonData = await response.json();

                    if (!jsonData.audioData) {
                        throw new Error("No audioData field in JSON response");
                    }

                    const base64Audio = jsonData.audioData.split(',')[1];
                    arrayBuffer = base64ToArrayBuffer(base64Audio);
                } else {
                    arrayBuffer = await response.arrayBuffer();
                }

                $$invalidate(20, audioBuffer = await decodeAudioData(arrayBuffer));
                startSliderValue.set(0);
                endSliderValue.set(audioBuffer.duration);
                drawWaveform();
            } catch(error) {
                console.error('Error fetching or decoding audio:', error);
            }
        }

        function loadSample() {
            const idToUse = externalOrdinalId || ordinalId;

            if (idToUse) {
                fetchAudio(idToUse);
            }
        }

        function drawWaveform() {
            if (!audioBuffer) return;
            const width = canvas.width;
            const height = canvas.height;
            const channelData = audioBuffer.getChannelData(0);
            const step = Math.ceil(channelData.length / width);
            const amp = height / 2;
            ctx.clearRect(0, 0, width, height);
            ctx.beginPath();

            for (let i = 0; i < width; i++) {
                const { min, max } = getMinMax(channelData, i * step, step);
                ctx.moveTo(i, amp * (1 + min));
                ctx.lineTo(i, amp * (1 + max));
            }

            ctx.stroke();
        }

        function toggleLoop() {
            $$invalidate(3, isLooping = !isLooping);
        }

        function playAudio() {
            sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(audioContext.destination);
            const startValue = $startSliderValue;
            const endValue = $endSliderValue;
            sourceNode.loop = isLooping;

            if (isLooping) {
                sourceNode.loopStart = Math.max(0, startValue);
                sourceNode.loopEnd = Math.min(endValue, audioBuffer.duration);
            }

            if (audioBuffer && startValue < endValue) {
                sourceNode.start(0, startValue, endValue - startValue);
                startTime = audioContext.currentTime - startValue;
                isPlaying = true;
                animatePlayback();
            }

            sourceNode.onended = () => {
                isPlaying = false;
                if (isLooping) playAudio();
            };
        }

        function stopAudio() {
            if (isPlaying && sourceNode) {
                sourceNode.disconnect();
                sourceNode = null;
                isPlaying = false;
            }

            $$invalidate(3, isLooping = false);
        }

        function getCurrentPlaybackPosition() {
            if (!isPlaying) return 0;
            return (audioContext.currentTime - startTime) % audioBuffer.duration;
        }

        function updatePlaybackCanvas() {
            const currentPosition = getCurrentPlaybackPosition();
            const width = playbackCanvas.width;
            const height = playbackCanvas.height;
            playbackCtx.clearRect(0, 0, width, height);
            const xPosition = currentPosition / audioBuffer.duration * width;
            playbackCtx.beginPath();
            playbackCtx.moveTo(xPosition, 0);
            playbackCtx.lineTo(xPosition, height);
            playbackCtx.strokeStyle = '#FF0000';
            playbackCtx.lineWidth = 2;
            playbackCtx.stroke();
        }

        function animatePlayback() {
            if (isPlaying) {
                updatePlaybackCanvas();
                requestAnimationFrame(animatePlayback);
            }
        }

        function input0_input_handler() {
            ordinalId = this.value;
            $$invalidate(4, ordinalId);
        }

        function canvas0_binding($$value) {
            binding_callbacks[$$value ? 'unshift' : 'push'](() => {
                canvas = $$value;
                $$invalidate(7, canvas);
            });
        }

        function canvas1_binding($$value) {
            binding_callbacks[$$value ? 'unshift' : 'push'](() => {
                playbackCanvas = $$value;
                $$invalidate(8, playbackCanvas);
            });
        }

        function input1_change_input_handler() {
            $startSliderValue = to_number(this.value);
            startSliderValue.set($startSliderValue);
        }

        function input2_change_input_handler() {
            $endSliderValue = to_number(this.value);
            endSliderValue.set($endSliderValue);
        }

        $$self.$$set = $$props => {
            if ('externalOrdinalId' in $$props) $$invalidate(17, externalOrdinalId = $$props.externalOrdinalId);
            if ('externalAudioContext' in $$props) $$invalidate(18, externalAudioContext = $$props.externalAudioContext);
            if ('channelIndex' in $$props) $$invalidate(19, channelIndex = $$props.channelIndex);
        };

        $$self.$$.update = () => {
            if ($$self.$$.dirty[0] & /*$startSliderValue*/ 4) {
                // Reactive statements to update formatted time
                $$invalidate(9, formattedStartTime = formatTime($startSliderValue));
            }

            if ($$self.$$.dirty[0] & /*$endSliderValue*/ 2) {
                $$invalidate(10, formattedEndTime = formatTime($endSliderValue));
            }

            if ($$self.$$.dirty[0] & /*externalOrdinalId*/ 131072) {
                if (externalOrdinalId) {
                    fetchAudio(externalOrdinalId);
                }
            }

            if ($$self.$$.dirty[0] & /*audioBuffer, $startSliderValue, maxDuration, $endSliderValue*/ 1048583) {
                // Update the dimmed widths reactively
                if (audioBuffer) {
                    $$invalidate(0, maxDuration = audioBuffer.duration);
                    $$invalidate(5, startDimmedWidth = `${Math.max(0, $startSliderValue / maxDuration) * 100}%`);
                    $$invalidate(6, endDimmedWidth = `${Math.max(0, 1 - $endSliderValue / maxDuration) * 100}%`);
                }
            }
        };

        return [
            maxDuration,
            $endSliderValue,
            $startSliderValue,
            isLooping,
            ordinalId,
            startDimmedWidth,
            endDimmedWidth,
            canvas,
            playbackCanvas,
            formattedStartTime,
            formattedEndTime,
            startSliderValue,
            endSliderValue,
            loadSample,
            toggleLoop,
            playAudio,
            stopAudio,
            externalOrdinalId,
            externalAudioContext,
            channelIndex,
            audioBuffer,
            input0_input_handler,
            canvas0_binding,
            canvas1_binding,
            input1_change_input_handler,
            input2_change_input_handler
        ];
    }

    class AudioTrimmer extends SvelteComponent {
        constructor(options) {
            super();

            init(
                this,
                options,
                instance,
                create_fragment$1,
                safe_not_equal,
                {
                    externalOrdinalId: 17,
                    externalAudioContext: 18,
                    channelIndex: 19
                },
                null,
                [-1, -1]
            );
        }
    }

    /* src/App.svelte generated by Svelte v3.59.2 */

    function create_fragment(ctx) {
        let main;
        let audiotrimmer;
        let current;
        audiotrimmer = new AudioTrimmer({});

        return {
            c() {
                main = element("main");
                create_component(audiotrimmer.$$.fragment);
            },
            m(target, anchor) {
                insert(target, main, anchor);
                mount_component(audiotrimmer, main, null);
                current = true;
            },
            p: noop,
            i(local) {
                if (current) return;
                transition_in(audiotrimmer.$$.fragment, local);
                current = true;
            },
            o(local) {
                transition_out(audiotrimmer.$$.fragment, local);
                current = false;
            },
            d(detaching) {
                if (detaching) detach(main);
                destroy_component(audiotrimmer);
            }
        };
    }

    class App extends SvelteComponent {
        constructor(options) {
            super();
            init(this, options, null, create_fragment, safe_not_equal, {});
        }
    }

    const app = new App({
      target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map