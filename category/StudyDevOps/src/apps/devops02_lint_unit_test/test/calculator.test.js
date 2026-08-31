import assert from 'node:assert/strict'
import test from 'node:test'
import { add, divide } from '../src/calculator.js'

test('add returns sum', () => {
  assert.equal(add(2, 3), 5)
})

test('divide returns quotient', () => {
  assert.equal(divide(6, 2), 3)
})

test('divide rejects zero divisor', () => {
  assert.throws(() => divide(1, 0), /division by zero/)
})
