import { test } from 'node:test';
import assert from 'node:assert/strict';
import { densitySurface } from '../src/surface.ts';

const n = 21;
const positions = new Float32Array(n ** 3 * 3);
const density = new Float32Array(n ** 3);
let index = 0;
for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
  const point = [x, y, z].map(v => (v - 10) * 0.4);
  positions.set(point, index * 3);
  density[index++] = Math.exp(-point.reduce((sum, v) => sum + v * v, 0) / 2);
}
test('Gaussian density levels recover radii σ and 2σ within grid resolution', () => {
  for (const radius of [1, 2]) {
    const geometry = densitySurface(n, positions, density, Math.exp(-(radius ** 2) / 2));
    const vertices = geometry.getAttribute('position');
    assert.ok(vertices.count > 0);
    assert.equal(vertices.count % 3, 0);
    for (let i = 0; i < vertices.count; i++) {
      const actual = Math.hypot(vertices.getX(i), vertices.getY(i), vertices.getZ(i));
      assert.ok(Math.abs(actual - radius) < 0.12, `${actual} vs ${radius}`);
    }
    geometry.dispose();
  }
});
test('zero field produces an empty surface, not NaN vertices', () => {
  const geometry = densitySurface(n, positions, new Float32Array(n ** 3), 0);
  assert.equal(geometry.getAttribute('position').count, 0);
  geometry.dispose();
});
