// Test writing and reading uint16 values in different endiannesses.

import {} from "mocha"
import {assert} from 'chai';
import * as strtok from '../lib';
import * as util from './util';

describe("Parse 16-bit unsigned integer", () => {

    describe("combined little- and big-endian", () => {

        it("should encode", () => {
            util.runGenerateTests(
                [(b) => {
                    const len = strtok.UINT16_LE.put(b, 0, 0);
                    return len + strtok.UINT16_LE.put(b, len, 0xffaa)
                }, '\x00\x00\xaa\xff'],
                [(b) => {
                    const len = strtok.UINT16_BE.put(b, 0, 0xf);
                    return len + strtok.UINT16_BE.put(b, len, 0xffaa)
                }, '\x00\x0f\xff\xaa'],
                [(b) => {
                    const len = strtok.UINT16_BE.put(b, 0, 0xffaa);
                    return len + strtok.UINT16_LE.put(b, len, 0xffaa)
                }, '\xff\xaa\xaa\xff']
            );
        });

        it("should decode", () => {
            const le = function (v) {
                assert.equal(v, 0x001a);
                return strtok.UINT16_BE;
            };

            const be = function (v) {
                assert.equal(v, 0x1a00);
                return strtok.UINT16_LE;
            };

            util.runParseTests('\x1a\x00\x1a\x00\x1a\x00\x1a\x00', [
                (v) => {
                    assert.ok(v === undefined);
                    return strtok.UINT16_LE;
                },
                le, be, le, be
            ]);
        });
    });
});



