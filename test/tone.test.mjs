import test from 'node:test';
import assert from 'node:assert/strict';
import { palette, clampTone } from '../src/tone.js';
test('tone maps white to black and flips ink for dark paper', () => {
  assert.equal(palette(0).vars.paper, 'hsl(0 0% 100%)');
  assert.equal(palette(100).vars.paper, 'hsl(0 0% 0%)');
  assert.equal(palette(30).dark, false);
  assert.equal(palette(70).dark, true);
  assert.equal(palette(undefined).vars.paper, 'hsl(0 0% 100%)');
  assert.equal(clampTone(-5), 0); assert.equal(clampTone(250), 100); assert.equal(clampTone('42.6'), 43);
});
