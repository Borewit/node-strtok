// Test writing and reading uint32 values in different endiannesses.

var assert = require('assert');
var util = require('./util');
var strtok = require('../src');

describe("Parse 32-bit unsigned integer", () => {

    describe("combined little- and big-endian", () => {

        it("should encode", () => {
            util.runGenerateTests(
                [(b) => {
                    return strtok.UINT32_LE.put(b, 0, 0);
                }, '\x00\x00\x00\x00'],
                [(b) => {
                    return strtok.UINT32_LE.put(b, 0, 0xff);
                }, '\xff\x00\x00\x00'],
                [(b) => {
                    return strtok.UINT32_BE.put(b, 0, 0);
                }, '\x00\x00\x00\x00'],
                [(b) => {
                    return strtok.UINT32_BE.put(b, 0, 0xff);
                }, '\x00\x00\x00\xff'],
                [(b) => {
                    return strtok.UINT32_LE.put(b, 0, 0xaabbccdd);
                }, '\xdd\xcc\xbb\xaa'],
                [(b) => {
                    return strtok.UINT32_BE.put(b, 0, 0xaabbccdd);
                }, '\xaa\xbb\xcc\xdd']
            );
        });

        it("should decode", () => {
            const le = function(v) {
                assert.equal(v, 0x001a001a);
                return strtok.UINT32_BE;
            };

            const be = function(v) {
                assert.equal(v, 0x1a001a00);
                return strtok.UINT32_LE;
            };

            util.runParseTests(
                '\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00',
                [
                    (v) => {
                        assert.ok(v === undefined);
                        return strtok.UINT32_LE;
                    },
                    le, be, le, be
                ]);
        });
    });
});