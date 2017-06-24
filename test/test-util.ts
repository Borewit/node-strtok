// Test our utilities
import {assert} from 'chai';
import {SinkStream} from './util';

describe("util", () => {

  describe("SinkStream", () => {

    it("it should be able to retrieve written data via the getBuffer()", () => {
      const s = new SinkStream();

      s.write('abcdef');
      assert.strictEqual(s.getBuffer().toString('binary'), 'abcdef');
    });

    it("should support multiple writes", () => {
      const s = new SinkStream(4);
      s.write('abcdef');
      s.write('qqqb');
      assert.strictEqual(s.getBuffer().toString('binary'), 'abcdefqqqb');
    });

  }); // SinkStream

}); // util