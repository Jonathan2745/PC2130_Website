import './style.css';
import { DEFAULT_EQUATION, WavefunctionEquation } from './equation';
import { gravityVector, observablesAt, type QuantumParams } from './quantum';
import { QuantumVisualizer, type ViewMode } from './visualizer';

const params: QuantumParams = {
  mass: 1,
  sigma: 0.65,
  hbar: 1,
  r0: { x: 0, y: 0, z: 4 },
  p0: { x: 2.4, y: 0, z: 1.2 },
  gravityMagnitude: 1.2,
  gravityAzimuthDeg: 0,
  gravityElevationDeg: -90,
};

let view: ViewMode = 'position';
let time = 0;
let playing = true;
let speed = 1;
let lastFrame = performance.now();
let lastPhysicsUpdate = -Infinity;
let forcePhysicsUpdate = true;

const equation = new WavefunctionEquation();
const viewport = must<HTMLElement>('viewport');
const visualizer = new QuantumVisualizer(viewport);
const equationInput = must<HTMLTextAreaElement>('equation');
equationInput.value = DEFAULT_EQUATION;

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

interface SliderSpec {
  label: string;
  min: number;
  max: number;
  step: number;
  get: () => number;
  set: (value: number) => void;
  unit?: string;
}

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
  input.addEventListener('input', () => {
    spec.set(Number(input.value));
    value.textContent = format(spec.get(), spec.unit);
    forcePhysicsUpdate = true;
    updateHUD();
  });
  row.append(title, input, value);
  parent.appendChild(row);
}

function format(value: number, unit = ''): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 1 : abs >= 10 ? 2 : 3;
  return `${value.toFixed(digits)}${unit}`;
}

slider('center-controls', { label: 'x₀', min: -10, max: 10, step: 0.1, get: () => params.r0.x, set: v => params.r0.x = v });
slider('center-controls', { label: 'y₀', min: -10, max: 10, step: 0.1, get: () => params.r0.y, set: v => params.r0.y = v });
slider('center-controls', { label: 'z₀', min: -10, max: 10, step: 0.1, get: () => params.r0.z, set: v => params.r0.z = v });

slider('momentum-controls', { label: 'pₓ₀', min: -10, max: 10, step: 0.1, get: () => params.p0.x, set: v => params.p0.x = v });
slider('momentum-controls', { label: 'pᵧ₀', min: -10, max: 10, step: 0.1, get: () => params.p0.y, set: v => params.p0.y = v });
slider('momentum-controls', { label: 'p𝓏₀', min: -10, max: 10, step: 0.1, get: () => params.p0.z, set: v => params.p0.z = v });

slider('gravity-controls', { label: '|g|', min: 0, max: 15, step: 0.05, get: () => params.gravityMagnitude, set: v => params.gravityMagnitude = v });
slider('gravity-controls', { label: 'azimuth', min: -180, max: 180, step: 1, get: () => params.gravityAzimuthDeg, set: v => params.gravityAzimuthDeg = v, unit: '°' });
slider('gravity-controls', { label: 'elevation', min: -90, max: 90, step: 1, get: () => params.gravityElevationDeg, set: v => params.gravityElevationDeg = v, unit: '°' });

slider('quantum-controls', { label: 'mass m', min: 0.1, max: 5, step: 0.05, get: () => params.mass, set: v => params.mass = v });
slider('quantum-controls', { label: 'σ₀', min: 0.15, max: 3, step: 0.05, get: () => params.sigma, set: v => params.sigma = v });
slider('quantum-controls', { label: 'ℏ', min: 0.1, max: 3, step: 0.05, get: () => params.hbar, set: v => params.hbar = v });

slider('time-control', {
  label: 't', min: 0, max: 8, step: 0.01,
  get: () => time,
  set: v => { time = v; playing = false; syncPlayButton(); },
});

const viewDescriptions: Record<ViewMode, string> = {
  position: 'Density surfaces of |ψ|². For the default Gaussian, the inner and outer meshes have radii σ and 2σ. These are not 68% and 95% probability volumes.',
  momentum: 'Momentum-space Gaussian. Uniform gravity shifts ⟨p⟩ by mgt while its intrinsic Gaussian width stays constant.',
  energy: 'K–V–E diagnostic meshes: independent kinetic and potential variations, with E = K + V, in standardized coordinates. These are illustrative spread contours, not quantum energy probability surfaces.',
};

must<HTMLInputElement>('phase-colour').addEventListener('change', event => {
  visualizer.phaseColour = (event.target as HTMLInputElement).checked;
  forcePhysicsUpdate = true;
  updateHUD();
});

must<HTMLElement>('view-switcher').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-view]');
  if (!button) return;
  view = button.dataset.view as ViewMode;
  document.querySelectorAll('#view-switcher button').forEach(b => b.classList.toggle('active', b === button));
  forcePhysicsUpdate = true;
  updateHUD();
});

must<HTMLButtonElement>('play').addEventListener('click', () => {
  playing = !playing;
  syncPlayButton();
});
must<HTMLButtonElement>('reset-time').addEventListener('click', () => {
  time = 0;
  playing = false;
  syncPlayButton();
  forcePhysicsUpdate = true;
  updateHUD();
});
must<HTMLSelectElement>('speed').addEventListener('change', event => {
  speed = Number((event.target as HTMLSelectElement).value);
});

// The editor is a draft until Apply succeeds. Insertion helpers never change the
// running wavefunction; ψ is the left-hand-side label, not a recursive variable.
const envelope = 'exp(-((x-xc)^2+(y-yc)^2+(z-zc)^2)/(4*sigma^2))';
const staticEnvelope = 'exp(-((x-x0)^2+(y-y0)^2+(z-z0)^2)/(4*sigma^2))';
const examples: Record<string, string> = {
  gaussian: DEFAULT_EQUATION,
  envelope: staticEnvelope,
  lobes: 'exp(-((x-x0-0.9)^2+(y-y0)^2+(z-z0)^2)/(4*sigma^2)) + exp(-((x-x0+0.9)^2+(y-y0)^2+(z-z0)^2)/(4*sigma^2))',
  phase: `${staticEnvelope} * exp(i*(px0*(x-x0)+py0*(y-y0)+pz0*(z-z0))/hbar)`,
};
function markDraft(): void {
  const status = must<HTMLElement>('equation-status');
  status.className = 'status draft';
  status.textContent = 'Draft changes — click Apply equation to update the visualization.';
}
equationInput.addEventListener('input', markDraft);
must<HTMLButtonElement>('load-example').addEventListener('click', () => {
  equationInput.value = examples[must<HTMLSelectElement>('equation-example').value];
  markDraft();
  equationInput.focus();
});
const toolbar = must<HTMLElement>('equation-toolbar');
// Preserve the textarea selection on mouse presses; keyboard activation also
// uses selectionStart/End, which remain available after focus leaves the field.
toolbar.addEventListener('mousedown', event => event.preventDefault());
toolbar.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-insert]');
  if (!button) return;
  const token = button.dataset.insert!;
  const start = equationInput.selectionStart, end = equationInput.selectionEnd;
  const selected = equationInput.value.slice(start, end);
  let text = token;
  let selectFrom = 0, selectTo = 0;
  if (['exp', 'sin', 'cos', 'sqrt'].includes(token)) {
    const argument = selected || (token === 'sqrt' ? '1' : '0');
    text = `${token}(${argument})`;
    selectFrom = token.length + 1;
    selectTo = selectFrom + argument.length;
  } else if (token === 'square') {
    text = `(${selected || 'x'})^2`;
    selectFrom = 1;
    selectTo = 1 + (selected || 'x').length;
  } else if (token === 'gaussian') {
    text = envelope;
  }
  equationInput.setRangeText(text, start, end, 'end');
  equationInput.focus();
  if (selectTo) equationInput.setSelectionRange(start + selectFrom, start + selectTo);
  markDraft();
});

must<HTMLButtonElement>('apply-equation').addEventListener('click', () => {
  const status = must<HTMLElement>('equation-status');
  try {
    // Compile once; subsequent frames evaluate this expression at spatial samples.
    equation.set(equationInput.value);
    status.className = 'status ok';
    status.textContent = 'Equation compiled successfully and is driving position space. Other observables remain Gaussian diagnostics.';
    forcePhysicsUpdate = true;
  } catch (error) {
    status.className = 'status error';
    status.textContent = error instanceof Error ? error.message : String(error);
  }
});

must<HTMLButtonElement>('reset-equation').addEventListener('click', () => {
  equation.reset();
  equationInput.value = equation.value;
  const status = must<HTMLElement>('equation-status');
  status.className = 'status ok';
  status.textContent = 'Restored the exact Gaussian solution for a uniform constant force.';
  forcePhysicsUpdate = true;
});

function syncPlayButton(): void {
  must<HTMLButtonElement>('play').textContent = playing ? 'Pause' : 'Play';
}

function updateHUD(): void {
  const o = observablesAt(time, params);
  const g = gravityVector(params);
  must<HTMLElement>('view-description').textContent = viewDescriptions[view];
  const axisDescriptions: Record<ViewMode, string> = {
    position: 'Axes: red = x · green = y · blue = z (vertical). Position in model length units.',
    momentum: 'Axes: red = pₓ · green = pᵧ · blue = p_z (vertical). Model momentum units.',
    energy: 'Axes: red = K · green = V · blue = E (vertical). Centred, standardized diagnostic coordinates; display scale ×2.2.',
  };
  must<HTMLElement>('axis-description').textContent = axisDescriptions[view];
  must<HTMLElement>('view-badge').textContent = `${view.toUpperCase()} SPACE`;
  must<HTMLElement>('gravity-vector').textContent = `g = (${g.x.toFixed(2)}, ${g.y.toFixed(2)}, ${g.z.toFixed(2)})`;
  must<HTMLElement>('potential-chip').textContent = `V(r) = −m g·r`;

  const custom = equation.value !== DEFAULT_EQUATION;
  const phaseToggle = must<HTMLInputElement>('phase-colour');
  phaseToggle.disabled = view !== 'position';
  must<HTMLElement>('phase-legend').hidden = view !== 'position' || !visualizer.phaseColour;
  must<HTMLElement>('inner-label').textContent = view === 'energy' ? 'Inner: diagnostic spread ×1' : custom && view === 'position' ? 'Inner: 60.7% of peak density' : 'Inner: radius σ';
  must<HTMLElement>('outer-label').textContent = view === 'energy' ? 'Outer: diagnostic spread ×2' : custom && view === 'position' ? 'Outer: 13.5% of peak density' : 'Outer: radius 2σ';
  must<HTMLElement>('sampling-note').textContent = custom && view === 'position'
    ? 'Custom ψ: surfaces and moments use a 21³ grid within ±4 analytic σ of the reference center. Features outside this box or below grid resolution may be missed. The path and force arrow remain Gaussian references.'
    : 'Phase colour is available in position space. Variance is shown per coordinate, in squared position units.';
  const stats = view === 'position' ? visualizer.positionStats : null;
  const positionMean = custom && view === 'position' ? stats?.mean : o.center;
  const positionVariance = custom && view === 'position' ? stats?.variance : { x: o.sigmaT ** 2, y: o.sigmaT ** 2, z: o.sigmaT ** 2 };
  const vectorText = (v: { x: number; y: number; z: number } | null | undefined) => v ? `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})` : 'undefined';
  must<HTMLElement>('observables').innerHTML = `
    <div><span>t</span><strong>${time.toFixed(2)}</strong></div>
    <div><span>⟨r⟩${custom ? " ≈" : ""}</span><strong>${vectorText(positionMean)}</strong></div>
    <div><span>Var(r)${custom ? " ≈" : ""}</span><strong>${vectorText(positionVariance)}</strong></div>
    <div><span>⟨p⟩</span><strong>(${o.meanMomentum.x.toFixed(2)}, ${o.meanMomentum.y.toFixed(2)}, ${o.meanMomentum.z.toFixed(2)})</strong></div>
    <div><span>σ₍ref₎(t)</span><strong>${o.sigmaT.toFixed(3)}</strong></div>
    <div><span>⟨K⟩</span><strong>${o.kinetic.toFixed(3)}</strong></div>
    <div><span>⟨V⟩</span><strong>${o.potential.toFixed(3)}</strong></div>
    <div><span>⟨E⟩</span><strong>${o.total.toFixed(3)}</strong></div>
  `;

  // Keep the t slider synchronized when animation advances it programmatically.
  const timeSlider = must<HTMLElement>('time-control').querySelector<HTMLInputElement>('input[type=range]');
  const timeOutput = must<HTMLElement>('time-control').querySelector<HTMLOutputElement>('output');
  if (timeSlider) timeSlider.value = String(time);
  if (timeOutput) timeOutput.textContent = time.toFixed(3);
}

function animate(now: number): void {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (playing) {
    time += dt * speed;
    if (time > 8) time = 0;
  }

  if (forcePhysicsUpdate || (playing && now - lastPhysicsUpdate > 55)) {
    // Time is substituted into ψ; there is no numerical Schrödinger integrator.
    // update evaluates density / phase and rebuilds geometry, render draws it.
    visualizer.update(view, time, params, equation);
    updateHUD();
    lastPhysicsUpdate = now;
    forcePhysicsUpdate = false;
  }
  visualizer.render();
  requestAnimationFrame(animate);
}

syncPlayButton();
updateHUD();
requestAnimationFrame(animate);
