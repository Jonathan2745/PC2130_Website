/** EDIT HERE: view explanations, legends, axis descriptions and observable formatting. */
import { DEFAULT_EQUATION, type WavefunctionEquation } from "../equation";
import { gravityVector, observablesAt, type QuantumParams } from "../quantum";
import type { QuantumVisualizer, ViewMode } from "../visualizer";
import { must } from "./dom";
import { updatePhysicalValues } from "./units";
const viewDescriptions: Record<ViewMode, string> = {
  position: 'Density surfaces of |ψ|². For the default Gaussian, the inner and outer meshes have radii σ and 2σ. These are not 68% and 95% probability volumes.',
  momentum: 'Momentum-space Gaussian. Uniform gravity shifts ⟨p⟩ by mgt while its intrinsic Gaussian width stays constant.',
  energy: 'K–V–E diagnostic meshes: independent kinetic and potential variations, with E = K + V, in standardized coordinates. These are illustrative spread contours, not quantum energy probability surfaces.',
};

export function updateHUD(view: ViewMode, time: number, params: QuantumParams, equation: WavefunctionEquation, visualizer: QuantumVisualizer): void {
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
  updatePhysicalValues(params);

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

