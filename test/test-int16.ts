// Test reading int16 values.

import {} from "mocha"
import {assert} from 'chai';
import * as strtok from '../src';
import * as util from './util';

describe("Parse 16-bit signed integer", () => {

    describe("big-endian", () => {

        it("should encode", () => {

            util.runGenerateTests(
                [(b) => {
                    return strtok.INT16_BE.put(b, 0, 0x00);
                }, '\x00\x00'],
                [(b) => {
                    return strtok.INT16_BE.put(b, 0, 0x0f0b);
                }, '\x0f\x0b'],
                [(b) => {
                    return strtok.INT16_BE.put(b, 0, -0x0f0b);
                }, '\xf0\xf5']
            );

        });

        it("should decode", () => {

            util.runParseTests('\x0a\x1a\x00\x00\xff\xff\x80\x00', [
                (v) =>{
                    assert.ok(v === undefined);
                    return strtok.INT16_BE;
                },
                (v) =>{
                    assert.equal(v, 2586);
                    return strtok.INT16_BE;
                },
                (v) =>{
                    assert.equal(v, 0);
                    return strtok.INT16_BE;
                },
                (v) =>{
                    assert.equal(v, -1);
                    return strtok.INT16_BE;
                },
                (v) =>{
                    assert.equal(v, -32768);
                    return strtok.INT16_BE;
                }
            ]);

        });
    });

    /* ToDO
    describe("little-endian", () => {

        it("should encode", () => {

            util.runGenerateTests(
                [(b) => {
                    return strtok.INT16_LE.put(b, 0, 0x00);
                }, '\x00\x00'],
                [(b) => {
                    return strtok.INT16_LE.put(b, 0, 0x0f0b);
                }, '\x0b\x0f'],
                [(b) => {
                    return strtok.INT16_LE.put(b, 0, -0x0f0b);
                }, '\xf5\xf0']
            );

        });

        it("should decode", () => {

            util.runParseTests('\x1a\x0a\x00\x00\xff\xff\x00\x80', [
                (v) =>{
                    assert.ok(v === undefined);
                    return strtok.INT16_LE;
                },
                (v) =>{
                    assert.equal(v, 2586);
                    return strtok.INT16_LE;
                },
                (v) =>{
                    assert.equal(v, 0);
                    return strtok.INT16_LE;
                },
                (v) =>{
                    assert.equal(v, -1);
                    return strtok.INT16_LE;
                },
                (v) =>{
                    assert.equal(v, -32768);
                    return strtok.INT16_LE;
                }
            ]);

        });
    });
    */


});
