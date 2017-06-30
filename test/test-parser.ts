// Test deferral of next-known type.

import {} from "mocha"
import {assert} from 'chai';
import * as util from './util';
import * as strtok from '../lib';
import {IGetToken} from 'token-types';
import {EventEmitter} from 'events'

describe("Parser", () => {

    it("should decode '\\x05peter'", (done) => {

        util.runParseTests('\x05peter', [
            (v) => {
                assert.ok(v === undefined);
                return strtok.UINT8;
            },
            (v) => {
                assert.ok(typeof v === 'number');
                return new strtok.BufferType(v);
            },
            (v) => {
                assert.ok(typeof v === 'object');
                assert.equal(v.toString('utf-8'), 'peter');
                done();
                return strtok.DONE;
            }
        ]);

    });

    it("should defer", (done) => {

        let i = 0;

        const f = function (v, cb) {
            assert.equal(v, 0x1a);

            process.nextTick(function () {
                cb(strtok.UINT8)
            });

            ++i;

            if (i === 6) {
                process.nextTick(done);
            }

            return strtok.DEFER;
        };

        util.runParseTests('\x1a\x1a\x1a\x1a\x1a\x1a', [
            (v) => {
                assert.ok(v === undefined);
                return strtok.UINT8;
            },
            f, f, f, f, f, f
        ]);

    });

    it("should ignore", (done) => {

        util.runParseTests('\x04asdfaoeu', [
            (v) => {
                assert.ok(v === undefined);
                return strtok.UINT8;
            },
            (v) => {
                assert.strictEqual(v, 4);
                return new strtok.IgnoreType(4);
            },
            (v) => {
                assert.equal(v, null);
                return new strtok.BufferType(4);
            },
            (v) => {
                assert.ok(Buffer.isBuffer(v));
                assert.equal(v.toString('utf8'), 'aoeu');
                done();
                return strtok.DONE;
            }
        ]);
    });

    it("should handle DONE token", (done) => {

        util.runParseTests('\x1a\x1a\x1a\x1a\x1a\x1a', [
            (v) => {
                assert.ok(v === undefined);
                return strtok.UINT8;
            },
            (v) => {
                process.nextTick(done);
                return strtok.DONE;
            }
        ]);
    });

    it("should handle DONE token #2", (done) => {

        let s = new EventEmitter();

        strtok.parse(s, ( () => {
            const bufsSeen = [];

            return (v) => {
                if (v === undefined) {
                    return strtok.UINT8;
                }

                assert.equal(v, 0xff);

                s.on('data', function(b) {
                    bufsSeen.push(b);
                });

                process.nextTick(() => {
                    assert.equal(bufsSeen.length, 2);
                    assert.equal(
                        bufsSeen[0].toString('binary'),
                        '\x11\x22'
                    );
                    assert.equal(
                        bufsSeen[1].toString('binary'),
                        'abcdef\xff'
                    );

                    s.removeAllListeners();
                    done();
                });

                return strtok.DONE;
            };
        })());

        s.emit('data', new Buffer('\xff\x11\x22', 'binary'));
        s.emit('data', new Buffer('abcdef\xff', 'binary'));
    });

    it("should behave correctly when faced with disjoint buffers", (done) => {

        const TESTTAB = [
            [1, 1, 1, 1],
            [4],
            [1, 1, 1, 1, 4],
            [2, 2],
            [3, 3, 3, 3],
            [1, 4, 3],
            [5],
            [5, 5, 5]
        ];

        class SourceStream extends EventEmitter {

            public nvals: number;
            private buf: Buffer;

            constructor(private lens: number[]) {
                super();

                let len = 0;
                this.lens.forEach((v) => {
                    len += v;
                });

                this.nvals = Math.floor(len / 4);

                let data = '';
                for (let i = 0; i < this.nvals + 1; i++) {
                    data += '\x01\x02\x03\x04';
                }

                this.buf = new Buffer(data, 'binary');

                process.nextTick( () => this.emitData() );
            }

            emitData() {
                if (this.lens.length == 0) {
                    this.emit('end');
                    return;
                }

                let l = this.lens.shift();
                let b = this.buf.slice(0, l);
                this.buf = this.buf.slice(l, this.buf.length);

                this.emit('data', b);

                process.nextTick( () => this.emitData() );
            };
        }

        const run = () => {
            if (TESTTAB.length == 0) {
                return;
            }

            const t = TESTTAB.shift();
            const s = new SourceStream(t);

            const stateTab: ((v: any) => IGetToken<any> | {})[] = [
                (v) => {
                    assert.strictEqual(v, undefined);
                    return strtok.UINT32_BE;
                }
            ];
            for (let i = 0; i < s.nvals - 1; i++) {
                stateTab.push( (v) => {
                    assert.equal(v, 16909060);
                    return strtok.UINT32_BE;
                });
            }
            stateTab.push( (v) => {
                assert.equal(v, 16909060);

                run();

                return strtok.DONE;
            });

            util.runParseTests(s, stateTab);
        };

        run(); // run test
        done(); // end of test

    });

});

