import * as wasm from './index_bg.wasm';

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    if (typeof(heap_next) !== 'number') throw new Error('corrupt heap');

    heap[idx] = obj;
    return idx;
}

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error('expected a boolean argument');
    }
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let WASM_VECTOR_LEN = 0;

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (typeof(arg) !== 'string') throw new Error('expected a string argument');

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) wasm.__wbindgen_export_2.get(dtor)(a, state.b);
            else state.a = a;
        }
    };
    real.original = state;
    return real;
}

function logError(f) {
    return function () {
        try {
            return f.apply(this, arguments);

        } catch (e) {
            let error = (function () {
                try {
                    return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
                } catch(_) {
                    return "<failed to stringify thrown value>";
                }
            }());
            console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
            throw e;
        }
    };
}

function _assertNum(n) {
    if (typeof(n) !== 'number') throw new Error('expected a number argument');
}
function __wbg_adapter_16(arg0, arg1) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h51eedd09453a9ae3(arg0, arg1);
}

/**
*/
export function start() {
    wasm.start();
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function handleError(f) {
    return function () {
        try {
            return f.apply(this, arguments);

        } catch (e) {
            wasm.__wbindgen_exn_store(addHeapObject(e));
        }
    };
}

function notDefined(what) { return () => { throw new Error(`${what} is not defined`); }; }

export const __wbindgen_cb_forget = function(arg0) {
    takeObject(arg0);
};

export const __wbindgen_string_new = function(arg0, arg1) {
    var ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

export const __wbg_log_cde88b406133f4bb = logError(function(arg0, arg1) {
    console.log(getStringFromWasm0(arg0, arg1));
});

export const __wbg_instanceof_Window_747b56d25bab9510 = logError(function(arg0) {
    var ret = getObject(arg0) instanceof Window;
    _assertBoolean(ret);
    return ret;
});

export const __wbg_document_c9bb82e72b87972b = logError(function(arg0) {
    var ret = getObject(arg0).document;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
});

export const __wbg_setInterval_feaefc56d2295c96 = handleError(function(arg0, arg1, arg2) {
    var ret = getObject(arg0).setInterval(getObject(arg1), arg2);
    _assertNum(ret);
    return ret;
});

export const __wbg_getElementById_66a113a03886aac6 = logError(function(arg0, arg1, arg2) {
    var ret = getObject(arg0).getElementById(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
});

export const __wbg_instanceof_CanvasRenderingContext2d_619282746f6101d3 = logError(function(arg0) {
    var ret = getObject(arg0) instanceof CanvasRenderingContext2D;
    _assertBoolean(ret);
    return ret;
});

export const __wbg_setglobalAlpha_deb886f4dd6fcb4c = logError(function(arg0, arg1) {
    getObject(arg0).globalAlpha = arg1;
});

export const __wbg_setfillStyle_52278f0fc6e7e85f = logError(function(arg0, arg1) {
    getObject(arg0).fillStyle = getObject(arg1);
});

export const __wbg_fillRect_8c22b56874211a38 = logError(function(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).fillRect(arg1, arg2, arg3, arg4);
});

export const __wbg_instanceof_HtmlCanvasElement_0feb941e3d100079 = logError(function(arg0) {
    var ret = getObject(arg0) instanceof HTMLCanvasElement;
    _assertBoolean(ret);
    return ret;
});

export const __wbg_getContext_a8aab8274f84fca2 = handleError(function(arg0, arg1, arg2) {
    var ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
});

export const __wbg_newnoargs_714dec97cfe3da72 = logError(function(arg0, arg1) {
    var ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
});

export const __wbg_call_652fa4cfce310118 = handleError(function(arg0, arg1) {
    var ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
});

export const __wbg_globalThis_8f997d48cb67f28e = handleError(function() {
    var ret = globalThis.globalThis;
    return addHeapObject(ret);
});

export const __wbg_self_8a533577b0c752d3 = handleError(function() {
    var ret = self.self;
    return addHeapObject(ret);
});

export const __wbg_window_5912543aff64b459 = handleError(function() {
    var ret = window.window;
    return addHeapObject(ret);
});

export const __wbg_global_69b29294e4daedff = handleError(function() {
    var ret = global.global;
    return addHeapObject(ret);
});

export const __wbg_cos_a03fd33090abd6d0 = typeof Math.cos == 'function' ? Math.cos : notDefined('Math.cos');

export const __wbg_pow_ad108893b3a9279c = typeof Math.pow == 'function' ? Math.pow : notDefined('Math.pow');

export const __wbg_sin_df1ff77bc35ef293 = typeof Math.sin == 'function' ? Math.sin : notDefined('Math.sin');

export const __wbg_sqrt_f806087149baabd8 = typeof Math.sqrt == 'function' ? Math.sqrt : notDefined('Math.sqrt');

export const __wbindgen_is_undefined = function(arg0) {
    var ret = getObject(arg0) === undefined;
    _assertBoolean(ret);
    return ret;
};

export const __wbindgen_object_clone_ref = function(arg0) {
    var ret = getObject(arg0);
    return addHeapObject(ret);
};

export const __wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
};

export const __wbindgen_debug_string = function(arg0, arg1) {
    var ret = debugString(getObject(arg1));
    var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export const __wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

export const __wbindgen_closure_wrapper122 = logError(function(arg0, arg1, arg2) {
    var ret = makeMutClosure(arg0, arg1, 6, __wbg_adapter_16);
    return addHeapObject(ret);
});

