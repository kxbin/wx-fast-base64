const W = WXWebAssembly;

const wasmModule = wrap("/libs/wasm/base64-simd.wasm", {
    fallback: "/libs/wasm/base64.wasm",
});

function wrap(wasmFilePath, { fallback }) {
    return (importObject) => {
        return instantiate(wasmFilePath, importObject, fallback);
    };
}

async function instantiate(wasmFilePath, importObject = {}, fallback) {
    let promise = W.instantiate(wasmFilePath, importObject).catch((err) => {
        if (fallback === undefined) throw err;
        console.warn(err);
        console.warn("falling back to version without experimental feature");
        return W.instantiate(fallback, importObject);
    });
    let instance = promise.then((r) => r.instance);
    instance.importObject = importObject;
    return (await instance).exports;
}

// memory management
let memory = new W.Memory({ initial: 1 });
let offsets = [0]; // indices in memory.buffer until where functions have claimed memory
const MAX_PERSISTENT_BYTES = 1e6;
const bytesPerPage = 65536;

function allocate(n) {
    let lastOffset = offsets[offsets.length - 1];
    if (lastOffset + n > memory.buffer.byteLength) {
        const missingPages = Math.ceil(
            (lastOffset + n - memory.buffer.byteLength) / bytesPerPage
        );
        memory.grow(missingPages);
    }
    offsets.push(lastOffset + n);
    // console.log('allocating', lastOffset, lastOffset + n);
    return [memory, { byteOffset: lastOffset, byteLength: n }];
}

// convenience wrapper for memory allocation
// BEWARE: this is a leaky abstraction, because memory.grow makes the underlying buffer unusable,
// so the array can never be assumed to survive an await
// function allocateUint8(n) {
//   let [memory, view] = allocate(n);
//   return [memory, new Uint8Array(memory.buffer, view.byteOffset, n)];
// }

function free(myMemory, { byteOffset: start, byteLength: n }) {
    if (myMemory !== memory) {
        // myMemory won't be used by new function calls => no need to free
        return;
    }
    let i = offsets.indexOf(start + n);
    if (i !== -1) offsets.splice(i, 1);
    if (memory.buffer.byteLength >= MAX_PERSISTENT_BYTES) {
        // let memory be garbage collected after current consumers dispose references
        // => have to replace memory AND instances which hold a reference to memory
        setTimeout(() => {
            memory = new W.Memory({ initial: 1 });
            offsets = [0];
            instances = {};
        }, 0);
    }
}

const Base64 = {
    _bytes2base64: null,
    _base642bytes: null,
    _loadWasmModule: async function () {
        const { bytes2base64, base642bytes } = await wasmModule({
            imports: { memory },
        });
        this._bytes2base64 = bytes2base64;
        this._base642bytes = base642bytes;
    },
    fromUint8Array: async function (bytes) {
        let m = bytes.length;
        let k = m % 3;
        let n = Math.floor(m / 3) * 4 + (k && k + 1);
        let M = m + 2;
        let N = Math.ceil(m / 3) * 4;

        let [memory, view] = allocate(N + M);
        let decoded = new Uint8Array(memory.buffer, view.byteOffset, M);
        decoded.set(bytes);
        decoded[m] = 0;
        decoded[m + 1] = 0;

        this._bytes2base64(
            view.byteOffset,
            view.byteOffset + m,
            view.byteOffset + M
        );

        let encoded = new Uint8Array(memory.buffer, view.byteOffset + M, n);

        var steps = 0x1000;
        var strs = [];
        for (var i = 0, l = encoded.length; i < l; i += steps) {
            strs.push(
                String.fromCharCode.apply(null, encoded.subarray(i, i + steps))
            );
        }
        var base64 = strs.join("");

        if (k === 1) base64 += "==";
        if (k === 2) base64 += "=";
        free(memory, view);
        return base64;
    },
    toUint8Array: async function (base64) {
        base64 = base64.replace(/=/g, "");
        let n = base64.length;
        let rem = n % 4;
        let k = rem && rem - 1;
        let m = (n >> 2) * 3 + k;

        let [memory, view] = allocate(n + 16);
        let bytes = new Uint8Array(memory.buffer, view.byteOffset, n);
        for (var i = 0; i < n; i++) {
            bytes[i] = base64.charCodeAt(i);
        }

        this._base642bytes(bytes.byteOffset, bytes.byteOffset + n);
        let decoded = bytes.slice(0, m);
        free(memory, view);
        return decoded;
    },
};
Base64._loadWasmModule();

module.exports = Base64;
