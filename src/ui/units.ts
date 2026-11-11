/** EDIT HERE: SI reference scales and conversion readouts. Does not change model physics. */
import { gravityVector, type QuantumParams } from "../quantum";
import { must } from "./dom";
// A consistent SI interpretation: action unit ML²/T equals physical ℏ.
// Keep the numerical solver in model units to avoid tiny SI mesh coordinates.
export const physicalHbar = 6.62607015e-34 / (2 * Math.PI);
export const units = { lengthUnit: 1e-6, massUnit: 1e-26 };
export function setupUnitControls(updateHUD: () => void): void {
  for (const id of ['length-unit', 'mass-unit']) {
    const input = must<HTMLInputElement>(id);
    input.addEventListener('change', () => {
      const value = input.valueAsNumber;
      if (Number.isFinite(value) && value > 0 && value >= Number(input.min) && value <= 1e10) {
        if (id === 'length-unit') units.lengthUnit = value;
        else units.massUnit = value;
      }
      input.value = String(id === 'length-unit' ? units.lengthUnit : units.massUnit);
      updateHUD();
    });
  }

}

export function updatePhysicalValues(params: QuantumParams): void {
  const { lengthUnit, massUnit } = units;
  const g = gravityVector(params);
  const timeUnit = massUnit * lengthUnit ** 2 / physicalHbar;
  const momentumUnit = massUnit * lengthUnit / timeUnit;
  const energyUnit = massUnit * (lengthUnit / timeUnit) ** 2;
  const sci = (v: number) => v.toExponential(5);
  const vector = (v: { x: number; y: number; z: number }, scale: number) =>
    `(${sci(v.x * scale)}, ${sci(v.y * scale)}, ${sci(v.z * scale)})`;
  must<HTMLElement>('physical-values').textContent = [
    `Model ℏ = ${params.hbar}; effective SI ℏ = ${sci(params.hbar * physicalHbar)} J s`,
    `m = ${sci(params.mass * massUnit)} kg`,
    `σ₀ = ${sci(params.sigma * lengthUnit)} m`,
    `r₀ = ${vector(params.r0, lengthUnit)} m`,
    `p₀ = ${vector(params.p0, momentumUnit)} kg m/s`,
    `v₀ = ${vector(params.p0, lengthUnit / (params.mass * timeUnit))} m/s`,
    `g = ${vector(g, lengthUnit / timeUnit ** 2)} m/s²`,
    `F = ${vector(g, params.mass * massUnit * lengthUnit / timeUnit ** 2)} N`,
    `1 model time unit = ${sci(timeUnit)} s`,
    `1 model energy unit = ${sci(energyUnit)} J`,
  ].join('\n');
}
