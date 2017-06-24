// Utilies for testing

import {assert} from 'chai'
import {EventEmitter} from 'events'
import  * as strtok from '../lib'
import {IGetToken} from "../lib";

/**
 * A mock stream implementation that breaks up provided data into
 * random-sized chunks and emits 'data' events. This is used to simulate
 * data arriving with arbitrary packet boundaries.
 */
export class SourceStream extends EventEmitter {

    private buf: Buffer;

    constructor(private str: string = '', private min: number = 1, private max: number = str.length) {
        super();

        this.buf = new Buffer(str, 'binary');

        process.nextTick(() => this.emitData());
    }

    private emitData() {
        const len = Math.min(
            this.min + Math.floor(Math.random() * (this.max - this.min)),
            this.buf.length
        );

        const b = this.buf.slice(0, len);

        if (len < this.buf.length) {
            this.buf = this.buf.slice(len, this.buf.length);
            process.nextTick(() => this.emitData());
        } else {
            process.nextTick(() => {
                this.emit('end')
            });
        }

        this.emit('data', b);
    };


}

/**
 * Stream to accept write() calls and track them in its own buffer rather
 * than dumping them to a file descriptor
 */
export class SinkStream {

    private buf: Buffer;
    private bufOffset: number;

    constructor(private bufSz: number = 1024) {
        this.buf = new Buffer(bufSz);
        this.bufOffset = 0;
    }

    public write(s: string, encoding?: string) {
        let bl = (typeof arguments[0] === 'string') ?
            Buffer.byteLength(arguments[0], arguments[1]) :
            arguments[0].length;

        if (this.bufOffset + bl >= this.buf.length) {
            let b = new Buffer(((this.bufOffset + bl + this.bufSz - 1) / this.bufSz) * this.bufSz);
            this.buf.copy(b, 0, 0, this.bufOffset);
            this.buf = b;
        }

        if (typeof arguments[0] === 'string') {
            this.buf.write(arguments[0], this.bufOffset, arguments[1]);
        } else {
            arguments[0].copy(this.buf, this.bufOffset, 0, arguments[0].length);
        }

        this.bufOffset += bl;
    }

    public getBuffer(): Buffer {
        const b = new Buffer(this.bufOffset);
        this.buf.copy(b, 0, 0, this.bufOffset);

        return b;
    }

    public getString(): string {
        return this.getBuffer().toString('binary');
    }

    public reset() {
        this.bufOffset = 0;
    }
}

export class NullStream {

    public write(): boolean {
        return true;
    }
}

type handleState = (v, cb?) => IGetToken<any> | {};

/**
 * Run the given stream (or string, converted into a SourceStream) through
 * strtok,parse() and verify types that come back using the given state table.
 * @param s
 * @param stateTab
 */
export const runParseTests = function (s: string | EventEmitter, stateTab: handleState[]) {

    let cleanup: boolean = false;

    if (typeof s === 'string') {
        s = new SourceStream(s);
        cleanup = true;
    }

    assert.equal(typeof s, 'object');

    let state = 0;

    strtok.parse(s, (v, cb) => {
        assert.ok(state >= 0 && state < stateTab.length);
        return stateTab[state++](v, cb);
    });
};

/**
 * Run a series of tests that generate data and verify the resulting output.
 *
 * Each argument is a different test, and should be an array of length two
 * whose first element is a function and second element is a string
 * representing the expected outcome.
 */
export const runGenerateTests = function ( ...tests:([(b: Buffer) => number, string])[] ) {
    let b = new Buffer(1024);

    for (let i = 0; i < arguments.length; i++) {
        const len = arguments[i][0](b);
        assert.strictEqual(
            b.toString('binary', 0, len),
            arguments[i][1]
        );
    }
};

