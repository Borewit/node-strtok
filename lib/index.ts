// A fast streaming parser library.

import * as assert from 'assert';
//import * as buffer from 'buffer';
import {Buffer} from "buffer";

// Buffer for parse() to handle types that span more than one buffer
let SPANNING_BUF = new Buffer(1024);

// Possibly call flush()
const maybeFlush = function(b, o, len, flush) {
    if (o + len > b.length) {
        if (typeof(flush) !== 'function') {
            throw new Error(
                'Buffer out of space and no valid flush() function found'
            );
        }

        flush(b, o);

        return 0;
    }

    return o;
};

/**
 * Sentinel token interface
 */
export interface ISentinelToken {
}

/**
 * The DEFER token indicates that the protocol doesn't know what type of token to read from the stream next.
 * Perhaps the protocol needs to consult some out-of-process datastructure, or wait for some other event to occur.
 * To support this case, the protocol callback is actually invoked with 2 arguments: the value and a defer callback.
 * It is this second parameter, a callback, that must be invoked with the desired token type once the protocol layer has figured this out.
 * Note that between the time DEFER is returned and the callback is invoked, strtok.parse() is buffering all data received from the stream.
 */
export const DEFER: ISentinelToken = {};

/**
 * Indicates that the protocol parsing loop has come to an end, and that no more data need be read off of the stream
 * This causes strtok.parse() to disengage from the stream.
 */
export const DONE: ISentinelToken = {};

export interface IGetToken<T> {

    /**
     * Length in bytes of encoded value
     */
    len: number;

    /**
     * Decode value from buffer at offset
     * @param buf Buffer to read the decoded value from
     * @param off Decode offset
     */
    get(buf: Buffer, off: number): T;
}

export interface IToken<T> extends IGetToken<T> {
    /**
     * Encode value to buffer
     * @param buffer Buffer to write the encoded value to
     * @param offset Buffer write offset
     * @param value Value to decode of type T
     * @param flush ToDo
     */
    put(buffer: Buffer, offset: number, value: T, flush?: IFlush): number
}

export type IFlush = (b: Buffer, o: number) => void;

// Primitive types

/**
 * 8-bit unsigned integer
 */
export const UINT8: IToken<number> = {

    len: 1,

    get: function (buf, off): number {
        return buf[off];
    },

    put(b: Buffer, o: number, v: number, flush?: IFlush): number {
        assert.equal(typeof o, 'number');
        assert.equal(typeof v, 'number');
        assert.ok(v >= 0 && v <= 0xff);
        assert.ok(o >= 0);
        assert.ok(this.len <= b.length);

        const no = maybeFlush(b, o, this.len, flush);
        b[no] = v & 0xff;

        return (no - o) + this.len;
    }
};

/**
 * 16-bit unsigned integer, Little Endian byte order
 */
export const UINT16_LE: IToken<number> = {

    len: 2,

    get(buf: Buffer, off: number): number {
        return buf[off] | (buf[off + 1] << 8);
    },

    put(b: Buffer, o: number, v: number, flush?: IFlush): number {
        assert.equal(typeof o, 'number');
        assert.equal(typeof v, 'number');
        assert.ok(v >= 0 && v <= 0xffff);
        assert.ok(o >= 0);
        assert.ok(this.len <= b.length);

        const no = maybeFlush(b, o, this.len, flush);
        b[no] = v & 0xff;
        b[no + 1] = (v >>> 8) & 0xff;

        return (no - o) + this.len;
    }
};

/**
 * 16-bit unsigned integer, Big Endian byte order
 */
export const UINT16_BE: IToken<number> = {

    len: 2,

    get(buf: Buffer, off: number): number {
        return (buf[off] << 8) | buf[off + 1];
    },

    put(b: Buffer, o: number, v: number, flush?: IFlush): number {
        assert.equal(typeof o, 'number');
        assert.equal(typeof v, 'number');
        assert.ok(v >= 0 && v <= 0xffff);
        assert.ok(o >= 0);
        assert.ok(this.len <= b.length);

        const no = maybeFlush(b, o, this.len, flush);
        b[no] = (v >>> 8) & 0xff;
        b[no + 1] = v & 0xff;

        return (no - o) + this.len;
    }
};

/**
 * 24-bit unsigned integer, Little Endian byte order
 */
export const UINT24_LE: IToken<number> = {

    len: 3,

    get(buf: Buffer, off: number): number {
        return buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16);
    },

    put(b: Buffer, o: number, v: number, flush?: IFlush): number {
        assert.equal(typeof o, 'number');
        assert.equal(typeof v, 'number');
        assert.ok(v >= 0 && v <= 0xffffff);
        assert.ok(o >= 0);
        assert.ok(this.len <= b.length);

        const no = maybeFlush(b, o, this.len, flush);
        b[no] = v & 0xff;
        b[no + 1] = (v >>> 8) & 0xff;
        b[no + 2] = (v >>> 16) & 0xff;

        return (no - o) + this.len;
    }
};

/**
 * 24-bit unsigned integer, Big Endian byte order
 */
export const UINT24_BE: IToken<number> = {
    len : 3,
    get(buf: Buffer, off: number): number {
        return (((buf[off] << 8) + buf[off + 1]) << 8) + buf[off + 2]
    },
    put(b: Buffer, o: number, v: number, flush?: IFlush): number {
        assert.equal(typeof o, 'number');
        assert.equal(typeof v, 'number');
        assert.ok(v >= 0 && v <= 0xffffff);
        assert.ok(o >= 0);
        assert.ok(this.len <= b.length);

        var no = maybeFlush(b, o, this.len, flush);
        b[no] = (v >>> 16) & 0xff;
        b[no + 1] = (v >>> 8) & 0xff;
        b[no + 2] = v & 0xff;

        return (no - o) + this.len;
    }
};

/**
 * 32-bit unsigned integer, Little Endian byte order
 */
export const UINT32_LE: IToken<number> = {

    len: 4,

    get(buf: Buffer, off: number): number {
        // Shifting the MSB by 24 directly causes it to go negative if its
        // last bit is high, so we instead shift by 23 and multiply by 2.
        // Also, using binary OR to count the MSB if its last bit is high
        // causes the value to go negative. Use addition there.
        return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16)) +
            ((buf[off + 3] << 23) * 2);
    },

    put(b: Buffer, o: number, v: number, flush?: IFlush): number {
        assert.equal(typeof o, 'number');
        assert.equal(typeof v, 'number');
        assert.ok(v >= 0 && v <= 0xffffffff);
        assert.ok(o >= 0);
        assert.ok(this.len <= b.length);

        const no = maybeFlush(b, o, this.len, flush);
        b[no] = v & 0xff;
        b[no + 1] = (v >>> 8) & 0xff;
        b[no + 2] = (v >>> 16) & 0xff;
        b[no + 3] = (v >>> 24) & 0xff;

        return (no - o) + this.len;
    }
};

/**
 * 32-bit unsigned integer, Big Endian byte order
 */
export const UINT32_BE: IToken<number> = {

    len: 4,

    get(buf: Buffer, off: number): number {
        // See comments in UINT32_LE.get()
        return ((buf[off] << 23) * 2) +
            ((buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3]);
    },

    put(b: Buffer, o: number, v: number, flush?: IFlush): number {
        assert.equal(typeof o, 'number');
        assert.equal(typeof v, 'number');
        assert.ok(v >= 0 && v <= 0xffffffff);
        assert.ok(o >= 0);
        assert.ok(this.len <= b.length);

        const no = maybeFlush(b, o, this.len, flush);
        b[no] = (v >>> 24) & 0xff;
        b[no + 1] = (v >>> 16) & 0xff;
        b[no + 2] = (v >>> 8) & 0xff;
        b[no + 3] = v & 0xff;

        return (no - o) + this.len;
    }
};

/**
 * 8-bit signed integer
 */
export const INT8: IToken<number> = {

    len: 1,

    get(buf: Buffer, off: number): number {
        const v = UINT8.get(buf, off);
        return ((v & 0x80) === 0x80) ?
            (-128 + (v & 0x7f)) :
            v;
    },

    put(b: Buffer, o: number, v: number, flush?: IFlush): number {
        assert.equal(typeof o, 'number');
        assert.equal(typeof v, 'number');
        assert.ok(v >= -128 && v <= 127);
        assert.ok(o >= 0);
        assert.ok(this.len <= b.length);

        const no = maybeFlush(b, o, this.len, flush);
        b[no] = v & 0xff;

        return (no - o) + this.len;
    }
};

/**
 * 16-bit signed integer, Big Endian byte order
 */
export const INT16_BE: IToken<number> = {
    len: 2,
    get(buf: Buffer, off: number): number {
        const v = UINT16_BE.get(buf, off);
        return ((v & 0x8000) === 0x8000) ?
            (-32768 + (v & 0x7fff)) :
            v;
    },
    put(b: Buffer, o: number, v: number, flush?: IFlush): number {
        assert.equal(typeof o, 'number');
        assert.equal(typeof v, 'number');
        assert.ok(v >= -32768 && v <= 32767);
        assert.ok(o >= 0);
        assert.ok(this.len <= b.length);

        const no = maybeFlush(b, o, this.len, flush);
        b[no] = ((v & 0xffff) >>> 8) & 0xff;
        b[no + 1] = v & 0xff;

        return (no - o) + this.len;
    }
};

/**
 * 24-bit signed integer, Big Endian byte order
 */
export const INT24_BE: IToken<number> = {
    len: 3,
    get(buf: Buffer, off: number): number {
        const v = UINT24_BE.get(buf, off);
        return ((v & 0x800000) === 0x800000) ?
            (-0x800000 + (v & 0x7fffff)) : v;
    },
    put(b: Buffer, o: number, v: number, flush?: IFlush): number {
        assert.equal(typeof o, 'number');
        assert.equal(typeof v, 'number');
        assert.ok(v >= -0x800000 && v <= 0x7fffff);
        assert.ok(o >= 0);
        assert.ok(this.len <= b.length);

        const no = maybeFlush(b, o, this.len, flush);
        b[no] = (v >>> 16) & 0xff;
        b[no + 1] = (v >>> 8) & 0xff;
        b[no + 2] = v & 0xff;

        return (no - o) + this.len;
    }
};

/**
 * 32-bit signed integer, Big Endian byte order
 */
export const INT32_BE: IToken<number> = {
    len: 4,
    get(buf: Buffer, off: number): number {
        // We cannot check for 0x80000000 directly, as this always returns
        // false. Instead, check for the two's-compliment value, which
        // behaves as expected. Also, we cannot subtract our value all at
        // once, so do it in two steps to avoid sign busting.
        const v = UINT32_BE.get(buf, off);
        return ((v & 0x80000000) === -2147483648) ?
            ((v & 0x7fffffff) - 1073741824 - 1073741824) :
            v;
    },
    put(b: Buffer, o: number, v: number, flush?: IFlush): number {
        assert.equal(typeof o, 'number');
        assert.equal(typeof v, 'number');
        assert.ok(v >= -2147483648 && v <= 2147483647);
        assert.ok(o >= 0);
        assert.ok(this.len <= b.length);

        const no = maybeFlush(b, o, this.len, flush);
        b[no] = (v >>> 24) & 0xff;
        b[no + 1] = (v >>> 16) & 0xff;
        b[no + 2] = (v >>> 8) & 0xff;
        b[no + 3] = v & 0xff;

        return (no - o) + this.len;
    }
};


// Complex types
//
// These types are intended to allow callers to re-use them by manipulating
// the 'len' and other properties directly.

export class IgnoreType implements IGetToken<Buffer> {

    /**
     * @param len number of bytes to ignore
     */
    constructor(public len: number) {
    }

    // ToDo: don't read, but skip data
    public get(buf: Buffer, off: number): Buffer {
        return null;
    }
}


export class BufferType implements IGetToken<Buffer> {

    constructor(public len: number) {
    }

    public get(buf: Buffer, off: number): Buffer {
        return buf.slice(off, off + this.len);
    }
}

/**
 * Consume a fixed number of bytes from the stream and return a string with a specified encoding.
 */
export class StringType implements IGetToken<string> {

    constructor(public len: number, public encoding: string) {
    }

    public get(buf: Buffer, off: number): string {
        return buf.toString(this.encoding, off, off + this.len);
    }
}

/**
 * @param stream any EventEmitter that pumps out data events
 * @param cb invoked when a complete token has been read from the stream
 * @return Next token to read from the stream
 */
export const parse = function(s: any, cb?: any) {
    // Type of data that we're to parse next; if DEFER, we're awaiting
    // an invocation of typeCallback
    let type: IGetToken<any>;

    // Data that we've seen but not yet processed / handed off to cb; first
    // valid byte to process is always bufs[0][bufOffset]
    let bufs: Buffer[] = [];
    let bufsLen: number = 0;
    let bufOffset: number = 0;
    let ignoreLen: number = 0;

    // Callback for FSM to tell us what type to expect next
    let typeCallback = (t: IGetToken<any> | {}) => {
        if (type !== DEFER) {
            throw new Error('refusing to overwrite non-DEFER type');
        }

        type = t as IGetToken<any>;

        emitData();
    };

    // Process data that we have accumulated so far, emitting any type(s)
    // collected. This is the main parsing loop.
    //
    // Out strategy for handling buffers is to shift them off of the bufs[]
    // array until we have enough accumulated to account for type.len bytes.
    const emitData = () => {
        var b;
        while (type !== DONE && type !== DEFER && bufsLen >= type.len) {
            b = bufs[0];
            var bo = bufOffset;

            assert.ok(bufOffset >= 0 && bufOffset < b.length);

            if ((b.length - bufOffset) < type.len) {
                if (SPANNING_BUF.length < type.len) {
                    SPANNING_BUF = new Buffer(
                        Math.pow(2, Math.ceil(Math.log(type.len) / Math.log(2)))
                    );
                }

                b = SPANNING_BUF;
                bo = 0;

                let bytesCopied = 0;
                while (bytesCopied < type.len && bufs.length > 0) {
                    const bb = bufs[0];
                    const copyLength = Math.min(type.len - bytesCopied, bb.length - bufOffset);

                    // TODO: Manually copy bytes if we don't need many of them.
                    //       Bouncing down into C++ land to invoke
                    //       Buffer.copy() is expensive enough that we
                    //       shouldnt' do it unless we have a lot of dato to
                    //       copy.
                    bb.copy(
                        b,
                        bytesCopied,
                        bufOffset,
                        bufOffset + copyLength
                    );

                    bytesCopied += copyLength;

                    if (copyLength < (bb.length - bufOffset)) {
                        assert.equal(bytesCopied, type.len);
                        bufOffset += copyLength;
                    } else {
                        assert.equal(bufOffset + copyLength, bb.length);
                        bufs.shift();
                        bufOffset = 0;
                    }
                }

                assert.equal(bytesCopied, type.len);
            } else if ((b.length - bufOffset) === type.len) {
                bufs.shift();
                bufOffset = 0;
            } else {
                bufOffset += type.len;
            }

            bufsLen -= type.len;
            type = cb(type.get(b, bo), typeCallback);
            if (type instanceof IgnoreType) {
              ignoreLen += type.len;
              if (ignoreLen >= bufsLen) {
                // clear all buffers
                ignoreLen -= bufsLen;
                bufsLen = 0;
                bufs = [];
                bufOffset = 0;
              } else if (ignoreLen < bufs[0].length - bufOffset) {
                // set bufOffset correctly
                bufsLen -= ignoreLen;
                bufOffset += ignoreLen;
                ignoreLen = 0;
              } else if (bufsLen > 0) {
                // shift some buffers and set bufOffset correctly.
                bufsLen -= ignoreLen;
                ignoreLen += bufOffset;
                while (ignoreLen >= bufs[0].length) {
                  ignoreLen -= bufs.shift().length;
                }
                bufOffset = ignoreLen;
                ignoreLen = 0;
              }
              type = cb(type.get(null, 0), typeCallback);
            }
        }

        if (type === DONE) {
            s.removeListener('data', dataListener);

            // Pump all of the buffers that we already saw back through the
            // stream; the protocol layer will have set up listeners for this
            // event if it cares about the remaining data.
            while (bufs.length > 0) {
                b = bufs.shift();

                if (bufOffset > 0) {
                    b = b.slice(bufOffset, b.length);
                    bufOffset = 0;
                }

                s.emit('data', b);
            }
        }
    };

    // Listen for data from our stream
    const dataListener = function(d) {
        if (d.length <= ignoreLen) {
          // ignore this data
          assert.strictEqual(bufsLen, 0);
          assert.strictEqual(bufs.length, 0);
          ignoreLen -= d.length;
        } else if (ignoreLen > 0) {
          assert.strictEqual(bufsLen, 0);
          bufsLen = d.length - ignoreLen;
          bufs.push(d.slice(ignoreLen));
          ignoreLen = 0;
          emitData();
        } else {
          bufs.push(d);
          bufsLen += d.length;
          emitData();
        }
    };

    // Get the initial type
    type = cb(undefined, typeCallback);
    if (type !== DONE) {
        s.on('data', dataListener);
    }
};

// --- Complex types ---
//
// These types are intended to allow callers to re-use them by manipulating
// the 'len' and other properties directly


export type AnyToken = IGetToken<any> | ISentinelToken
