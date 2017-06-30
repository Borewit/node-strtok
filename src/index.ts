// A fast streaming parser library.

import * as assert from 'assert';
import * as Token from 'token-types';
import {IGetToken} from 'token-types';

/**
 * Buffer for parse() to handle types that span more than one buffer
 * @type {Buffer}
 */
let SPANNING_BUF = new Buffer(1024);

// Possibly call flush()
const maybeFlush = (b, o, len, flush) => {
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
 * The DEFER token indicates that the protocol doesn't know what type of token to read from the stream next.
 * Perhaps the protocol needs to consult some out-of-process datastructure, or wait for some other event to occur.
 * To support this case, the protocol callback is actually invoked with 2 arguments: the value and a defer callback.
 * It is this second parameter, a callback, that must be invoked with the desired token type once the protocol layer has figured this out.
 * Note that between the time DEFER is returned and the callback is invoked, strtok.parse() is buffering all data received from the stream.
 */
export const DEFER = {};

/**
 * Indicates that the protocol parsing loop has come to an end, and that no more data need be read off of the stream
 * This causes strtok.parse() to disengage from the stream.
 */
export const DONE = {};

export type IFlush = (b: Buffer, o: number) => void;

// Primitive types, derived from "token-types", declared for backward compatibility

/**
 * 8-bit unsigned integer
 */
export const UINT8 = Token.UINT8;

/**
 * 16-bit unsigned integer, Little Endian byte order
 */
export const UINT16_LE = Token.UINT16_LE;
/**
 * 16-bit unsigned integer, Big Endian byte order
 */
export const UINT16_BE = Token.UINT16_BE;

/**
 * 24-bit unsigned integer, Little Endian byte order
 */
export const UINT24_LE = Token.UINT24_LE;

/**
 * 24-bit unsigned integer, Big Endian byte order
 */
export const UINT24_BE = Token.UINT24_BE;

/**
 * 32-bit unsigned integer, Little Endian byte order
 */
export const UINT32_LE = Token.UINT32_LE;

/**
 * 32-bit unsigned integer, Big Endian byte order
 */
export const UINT32_BE = Token.UINT32_BE;

/**
 * 8-bit signed integer
 */
export const INT8 = Token.INT8;
/**
 * 16-bit signed integer, Big Endian byte order
 */
export const INT16_BE = Token.INT16_BE;

/**
 * 24-bit signed integer, Big Endian byte order
 */
export const INT24_BE = Token.INT24_BE;

/**
 * 32-bit signed integer, Big Endian byte order
 */
export const INT32_BE = Token.INT32_BE;

/**
 * Ignore a given number of bytes
 */
export const IgnoreType = Token.IgnoreType;

/**
 * Consume a fixed number of bytes from the stream and return a string with a specified encoding.
 */
export const StringType = Token.StringType;

export const BufferType = Token.BufferType;

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
    const typeCallback = (t: IGetToken<any> | {}) => {
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
        let b: Buffer;
        while (type !== DONE && type !== DEFER && bufsLen >= type.len) {
            b = bufs[0];
            let bo = bufOffset;

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
            if (type instanceof Token.IgnoreType) {
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
    const dataListener = function(d: Buffer) {
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


export type AnyToken = IGetToken<any> | {}
