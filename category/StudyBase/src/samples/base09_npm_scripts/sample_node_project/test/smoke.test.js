const assert = require('assert');
const { message } = require('../src/index');

assert.strictEqual(message('test'), 'npm script practice: test');
console.log('smoke test passed');
