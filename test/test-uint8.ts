// Test writing and reading uint8 values.

import {} from "mocha"
import {assert} from 'chai';
import * as strtok from '../src';
import * as util from './util';

describe("Parse 8-bit unsigned integer (UINT8)", () => {

    it("should encode", () => {
        util.runGenerateTests(
            [(b) => {
                return strtok.UINT8.put(b, 0, 0x22);
            }, '\x22'],
            [(b) => {
                return strtok.UINT8.put(b, 0, 0xff);
            }, '\xff']
        );
    });

    it("should decode", () => {

        const f = function(v) {
            assert.equal(v, 0x1a);
            return strtok.UINT8;
        };

        util.runParseTests('\x1a\x1a\x1a\x1a\x1a\x1a', [
            function(v) {
                assert.strictEqual(v, undefined);
                return strtok.UINT8;
            },
            f, f, f, f, f, f
        ]);
    });
});

