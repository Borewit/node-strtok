// Test reading int8 values.

import {} from "mocha"
import {assert} from 'chai';
import * as strtok from '../src';
import * as util from './util';

describe("Parse 8-bit signed integer (INT8)", () => {

    it("should encode", () => {
        util.runGenerateTests(
            [(b) => {
                return strtok.INT8.put(b, 0, 0x00);
            }, '\x00'],
            [(b) => {
                return strtok.INT8.put(b, 0, 0x22);
            }, '\x22'],
            [ (b) => {
                return strtok.INT8.put(b, 0, -0x22);
            }, '\xde']
        );
    });

    it("should decode", () => {

        util.runParseTests('\x00\x7f\x80\xff\x81', [
            (v) => {
                assert.ok(v === undefined);
                return strtok.INT8;
            },
            (v) => {
                assert.equal(v, 0);
                return strtok.INT8;
            },
            (v) => {
                assert.equal(v, 127);
                return strtok.INT8;
            },
            (v) => {
                assert.equal(v, -128);
                return strtok.INT8;
            },
            (v) => {
                assert.equal(v, -1);
                return strtok.INT8;
            },
            (v) => {
                assert.equal(v, -127);
                return strtok.INT8;
            }
        ]);
    });
});