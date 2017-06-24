// Test reading int24 values.

import {} from "mocha"
import {assert} from 'chai';
import * as strtok from '../lib';
import * as util from './util';

describe("Parse 24-bit signed integer", () => {

    describe("big-endian", () => {

        it("should encode", () => {
            util.runGenerateTests(
                [(b) => {
                    return strtok.INT24_BE.put(b, 0, 0x00);
                }, '\x00\x00\x00'],
                [(b) => {
                    return strtok.INT24_BE.put(b, 0, 0x0f0ba0);
                }, '\x0f\x0b\xa0'],
                [(b) => {
                    return strtok.INT24_BE.put(b, 0, -0x0f0bcc);
                }, '\xf0\xf4\x34']
            );
        });

        it("should decode", () => {
            util.runParseTests('\x00\x00\x00\xff\xff\xff\x10\x00\xff\x80\x00\x00', [
                (v) => {
                    assert.ok(v === undefined);
                    return strtok.INT24_BE;
                },
                (v) => {
                    assert.equal(v, 0);
                    return strtok.INT24_BE;
                },
                (v) => {
                    assert.equal(v, -1);
                    return strtok.INT24_BE;
                },
                (v) => {
                    assert.equal(v, 1048831);
                    return strtok.INT24_BE;
                },
                (v) => {
                    assert.equal(v, -8388608);
                    return strtok.INT24_BE;
                }
            ]);
        });
    });
});




