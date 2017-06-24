// Test writing and reading uint24 values in different endiannesses.

import {} from "mocha"
import {assert} from 'chai';
import * as strtok from '../lib';
import * as util from './util';

describe("Parse 24-bit unsigned integer", () => {

    describe("combined little- and big-endian", () => {

        it("should encode", () => {
            util.runGenerateTests(
                [(b) => {
                    return strtok.UINT24_LE.put(b, 0, 0);
                }, '\x00\x00\x00'],
                [(b) => {
                    return strtok.UINT24_LE.put(b, 0, 0xff);
                }, '\xff\x00\x00'],
                [(b) => {
                    return strtok.UINT24_BE.put(b, 0, 0);
                }, '\x00\x00\x00'],
                [(b) => {
                    return strtok.UINT24_BE.put(b, 0, 0xff);
                }, '\x00\x00\xff'],
                [(b) => {
                    return strtok.UINT24_LE.put(b, 0, 0xaabbcc);
                }, '\xcc\xbb\xaa'],
                [(b) => {
                    return strtok.UINT24_BE.put(b, 0, 0xaabbcc);
                }, '\xaa\xbb\xcc']
            );
        });

        it("should decode", () => {
            const le = function (v) {
                assert.equal(v, 0x001a1a);
                return strtok.UINT24_BE;
            };

            const be = function (v) {
                assert.equal(v, 0x1a1a00);
                return strtok.UINT24_LE;
            };

            util.runParseTests(
                '\x1a\x1a\x00\x1a\x1a\x00\x1a\x1a\x00\x1a\x1a\x00',
                [
                    (v) => {
                        assert.ok(v === undefined);
                        return strtok.UINT24_LE;
                    },
                    le, be, le, be
                ]);
        });
    });
});
