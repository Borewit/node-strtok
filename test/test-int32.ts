// Test reading int32 values.

import {} from "mocha"
import {assert} from 'chai';
import * as strtok from '../lib';
import * as util from './util';

describe("Parse 32-bit signed integer", () => {

    describe("big-endian", () => {

        it("should encode", () => {
            util.runGenerateTests(
                [(b) => {
                    return strtok.INT32_BE.put(b, 0, 0x00);
                }, '\x00\x00\x00\x00'],
                [(b) => {
                    return strtok.INT32_BE.put(b, 0, 0x0f0bcca0);
                }, '\x0f\x0b\xcc\xa0'],
                [(b) => {
                    return strtok.INT32_BE.put(b, 0, -0x0f0bcca0);
                }, '\xf0\xf4\x33\x60']
            );
        });

        it("should decode", () => {
            util.runParseTests('\x00\x00\x00\x00\xff\xff\xff\xff\x00\x10\x00\xff\x80\x00\x00\x00', [
                (v) => {
                    assert.ok(v === undefined);
                    return strtok.INT32_BE;
                },
                (v) => {
                    assert.equal(v, 0);
                    return strtok.INT32_BE;
                },
                (v) => {
                    assert.equal(v, -1);
                    return strtok.INT32_BE;
                },
                (v) => {
                    assert.equal(v, 1048831);
                    return strtok.INT32_BE;
                },
                (v) => {
                    assert.equal(v, -2147483648);
                    return strtok.INT32_BE;
                }
            ]);
        });
    });
});

