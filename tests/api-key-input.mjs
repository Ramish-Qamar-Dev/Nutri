import assert from 'node:assert/strict';
import {normalizeApiKey, apiKeyInputError} from '../lib/api-key-input.ts';
const key='AQ.test-provider-key-fixture-only';
for(const input of [key, `  ${key}\n`, `"${key}"`, `‘${key}’`, `GEMINI_API_KEY="${key}"`, `export GOOGLE_API_KEY='${key}'`, `\uFEFF${key}\u200B`]) {
  assert.equal(normalizeApiKey(input),key);
  assert.equal(apiKeyInputError(normalizeApiKey(input)),null);
}
for(const input of ['', 'AIza...123', 'AIza••••123', 'AIza…123', 'a'.repeat(201), 'key name', 'https://example.test/key', `${key}\n${key}`]) {
  assert.ok(apiKeyInputError(normalizeApiKey(input)));
}
console.log('Key paste tests passed: clipboard wrappers normalized; masked, incomplete, and mixed input rejected.');
