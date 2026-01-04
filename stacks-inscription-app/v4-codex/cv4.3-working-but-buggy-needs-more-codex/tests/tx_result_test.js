import { responseOkCV, responseErrorCV, serializeCV, uintCV, trueCV } from '@stacks/transactions';
import { parseOkUIntFromTxResult } from '../src/stacks/txResult.js';

function toHex(u8) {
  return Buffer.from(u8).toString('hex');
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

console.log('--- Starting TX Result Parsing Tests ---');

console.log('\nTest 1: Parse from repr');
{
  const parsed = parseOkUIntFromTxResult({ repr: '(ok u42)' });
  assert(parsed.ok && parsed.value === 42, `Expected ok=42, got ${JSON.stringify(parsed)}`);
  console.log('PASS');
}

console.log('\nTest 2: Parse from hex (response ok uint)');
{
  const cv = responseOkCV(uintCV(99));
  const hex = `0x${toHex(serializeCV(cv))}`;
  const parsed = parseOkUIntFromTxResult({ hex });
  assert(parsed.ok && parsed.value === 99, `Expected ok=99, got ${JSON.stringify(parsed)}`);
  console.log('PASS');
}

console.log('\nTest 3: Err response detected');
{
  const cv = responseErrorCV(uintCV(100));
  const hex = `0x${toHex(serializeCV(cv))}`;
  const parsed = parseOkUIntFromTxResult({ hex });
  assert(!parsed.ok && parsed.kind === 'err_response', `Expected err_response, got ${JSON.stringify(parsed)}`);
  assert(parsed.errCode === 100, `Expected errCode=100, got ${JSON.stringify(parsed)}`);
  console.log('PASS');
}

console.log('\nTest 4: Ok but not uint (bool)');
{
  const cv = responseOkCV(trueCV());
  const hex = `0x${toHex(serializeCV(cv))}`;
  const parsed = parseOkUIntFromTxResult({ hex });
  assert(!parsed.ok && parsed.kind === 'not_uint', `Expected not_uint, got ${JSON.stringify(parsed)}`);
  console.log('PASS');
}

console.log('\n--- All TX Result Parsing Tests Passed ---');

