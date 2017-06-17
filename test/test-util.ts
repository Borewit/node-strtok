// Test our utilities

import {assert} from 'chai';
import {SinkStream} from './util';


let s = new SinkStream();
s.write('abcdef');
assert.strictEqual(s.getBuffer().toString('binary'), 'abcdef');

s = new SinkStream();
s.write('\x01\x02\x03\xff', 'binary');
assert.strictEqual(s.getBuffer().toString('binary'), '\x01\x02\x03\xff');

s = new SinkStream(4);
s.write('abcdef');
s.write('qqqb');
assert.strictEqual(s.getBuffer().toString('binary'), 'abcdefqqqb');
