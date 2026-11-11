/** EDIT HERE: position, momentum, velocity, field and quantum controls.
 * Sliders and numeric fields share params; onChange schedules rendering. */
import { gravityVector, type QuantumParams } from "../quantum";
import { must } from "./dom";
export function setupParameterControls(params: QuantumParams, onChange: () => void): void {
  interface SliderSpec {
    label: string;
    min: number;
    max: number;
    step: number;
    get: () => number;
    set: (value: number) => void;
    unit?: string;
  }

  const syncParameterControls: (() => void)[] = [];

  function slider(parentId: string, spec: SliderSpec): void {
    const parent = must<HTMLElement>(parentId);
    const row = document.createElement('label');
    row.className = 'slider-row';
    const title = document.createElement('span');
    title.className = 'slider-label';
    title.textContent = spec.label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    input.value = String(spec.get());
    const value = document.createElement('output');
    value.textContent = format(spec.get(), spec.unit);
    syncParameterControls.push(() => {
      const current = spec.get();
      // Coupled velocity/momentum edits can exceed the original slider range.
      input.min = String(Math.min(spec.min, current));
      input.max = String(Math.max(spec.max, current));
      input.value = String(current);
      value.textContent = format(current, spec.unit);
    });
    input.addEventListener('input', () => {
      spec.set(Number(input.value));
      syncParameterControls.forEach(sync => sync());
      onChange();
    });
    row.append(title, input, value);
    parent.appendChild(row);
  }

  function format(value: number, unit = ''): string {
    const abs = Math.abs(value);
    const digits = abs >= 100 ? 1 : abs >= 10 ? 2 : 3;
    return `${value.toFixed(digits)}${unit}`;
  }

  // Editable component fields share the same state as the existing sliders.
  function numberControl(parentId: string, label: string, get: () => number, set: (v: number) => void): void {
    const row = document.createElement('label');
    row.className = 'velocity-row';
    const title = document.createElement('span');
    title.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    const sync = () => { input.value = String(Number(get().toPrecision(12))); };
    sync();
    syncParameterControls.push(sync);
    input.addEventListener('change', () => {
      if (Number.isFinite(input.valueAsNumber)) {
        set(input.valueAsNumber);
        onChange();
      }
      syncParameterControls.forEach(refresh => refresh());
    });
    row.append(title, input);
    must<HTMLElement>(parentId).appendChild(row);
  }
  for (const [axis, name] of [['x', 'x'], ['y', 'y'], ['z', 'z']] as const) {
    numberControl('center-controls', `${name}₀`, () => params.r0[axis], v => params.r0[axis] = v);
    numberControl('momentum-controls', `p_${name}₀`, () => params.p0[axis], v => params.p0[axis] = v);
    numberControl('field-components', `g_${name}`, () => gravityVector(params)[axis], v => {
      const g = gravityVector(params);
      g[axis] = v;
      params.gravityMagnitude = Math.hypot(g.x, g.y, g.z);
      params.gravityAzimuthDeg = Math.atan2(g.y, g.x) * 180 / Math.PI;
      params.gravityElevationDeg = Math.atan2(g.z, Math.hypot(g.x, g.y)) * 180 / Math.PI;
    });
  }

  slider('center-controls', { label: 'x₀', min: -10, max: 10, step: 0.1, get: () => params.r0.x, set: v => params.r0.x = v });
  slider('center-controls', { label: 'y₀', min: -10, max: 10, step: 0.1, get: () => params.r0.y, set: v => params.r0.y = v });
  slider('center-controls', { label: 'z₀', min: -10, max: 10, step: 0.1, get: () => params.r0.z, set: v => params.r0.z = v });

  // Velocity and momentum describe one initial state, linked by p₀ = m v₀.
  // Numeric velocity inputs permit exact zero and do not impose artificial bounds.
  for (const [axis, label] of [['x', 'vₓ₀'], ['y', 'vᵧ₀'], ['z', 'v_z₀']] as const) {
    const row = document.createElement('label');
    row.className = 'velocity-row';
    const title = document.createElement('span');
    title.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.value = '0';
    syncParameterControls.push(() => {
      input.value = String(Number((params.p0[axis] / params.mass).toPrecision(12)));
    });
    input.addEventListener('change', () => {
      const velocity = input.valueAsNumber;
      if (Number.isFinite(velocity) && Number.isFinite(velocity * params.mass)) {
        params.p0[axis] = params.mass * velocity;
        onChange();
      }
      syncParameterControls.forEach(sync => sync());
    });
    row.append(title, input);
    must<HTMLElement>('velocity-controls').appendChild(row);
  }

  slider('momentum-controls', { label: 'pₓ₀', min: -10, max: 10, step: 0.1, get: () => params.p0.x, set: v => params.p0.x = v });
  slider('momentum-controls', { label: 'pᵧ₀', min: -10, max: 10, step: 0.1, get: () => params.p0.y, set: v => params.p0.y = v });
  slider('momentum-controls', { label: 'p𝓏₀', min: -10, max: 10, step: 0.1, get: () => params.p0.z, set: v => params.p0.z = v });

  slider('gravity-controls', { label: '|g|', min: 0, max: 15, step: 0.05, get: () => params.gravityMagnitude, set: v => params.gravityMagnitude = v });
  slider('gravity-controls', { label: 'azimuth', min: -180, max: 180, step: 1, get: () => params.gravityAzimuthDeg, set: v => params.gravityAzimuthDeg = v, unit: '°' });
  slider('gravity-controls', { label: 'elevation', min: -90, max: 90, step: 1, get: () => params.gravityElevationDeg, set: v => params.gravityElevationDeg = v, unit: '°' });

  slider('quantum-controls', { label: 'mass m', min: 0.1, max: 5, step: 0.05, get: () => params.mass, set: v => {
    // Preserve the selected launch velocity when mass changes.
    const ratio = v / params.mass;
    params.p0.x *= ratio;
    params.p0.y *= ratio;
    params.p0.z *= ratio;
    params.mass = v;
  } });
  slider('quantum-controls', { label: 'σ₀', min: 0.15, max: 3, step: 0.05, get: () => params.sigma, set: v => params.sigma = v });
  slider('quantum-controls', { label: 'ℏ', min: 0.1, max: 3, step: 0.05, get: () => params.hbar, set: v => params.hbar = v });


}
