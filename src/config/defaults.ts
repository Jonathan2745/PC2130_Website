/** EDIT HERE: initial physical parameters in model units. Each app gets a fresh object. */
import type { QuantumParams } from "../quantum";
export function createDefaultParams(): QuantumParams {
  return {
    mass: 1,
    sigma: 0.65,
    hbar: 1,
    r0: { x: 0, y: 0, z: 4 },
    p0: { x: 0, y: 0, z: 0 },
    gravityMagnitude: 1.2,
    gravityAzimuthDeg: 0,
    gravityElevationDeg: -90,
  };
}
