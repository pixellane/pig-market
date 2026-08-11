import assert from 'assert';
import { normalizePhilippineNumber, isValidPhilippineNumber } from '../src/utils/contactUtils.js';

function expectValid(input, expected) {
  const norm = normalizePhilippineNumber(input);
  assert.strictEqual(norm, expected, `Expected ${input} -> ${expected}, got ${norm}`);
  assert.strictEqual(isValidPhilippineNumber(input), true, `Expected isValid true for ${input}`);
}

function expectInvalid(input) {
  const norm = normalizePhilippineNumber(input);
  assert.strictEqual(norm, null, `Expected ${input} to be invalid, got ${norm}`);
  assert.strictEqual(isValidPhilippineNumber(input), false, `Expected isValid false for ${input}`);
}

// Valid cases
expectValid('09171234567', '09171234567');
expectValid('+639171234567', '09171234567');
expectValid('9171234567', '09171234567');
expectValid(' 09171234567 ', '09171234567');
expectValid('+63 917 123 4567', '09171234567');

// Invalid cases
expectInvalid('');
expectInvalid(' ');
expectInvalid(null);
expectInvalid(undefined);
expectInvalid('0');
expectInvalid('3');
expectInvalid('09');
expectInvalid('0917');
expectInvalid('0917123');
expectInvalid('abc');

console.log('All contactUtils tests passed.');
