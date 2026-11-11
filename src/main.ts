/** APP ENTRYPOINT: creates the simulation and connects UI modules.
 * Edit playback timing here; see CODE_GUIDE.md for all other editing locations. */
import './style.css';
import { WavefunctionEquation } from './equation';
import { QuantumVisualizer, type ViewMode } from './visualizer';
import { createDefaultParams } from './config/defaults';
import { must } from './ui/dom';
import { setupParameterControls } from './ui/parameter-controls';
import { setupEquationEditor } from './ui/equation-editor';
import { setupUnitControls } from './ui/units';
import { updateHUD as renderReadouts } from './ui/readouts';

const params = createDefaultParams();
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

function updateHUD(): void { renderReadouts(view, time, params, equation, visualizer); }
function refresh(): void { forcePhysicsUpdate = true; updateHUD(); }
setupParameterControls(params, refresh);
setupUnitControls(updateHUD);
setupEquationEditor(equation, refresh);

// Playback slider is independent of the physical-parameter controls.
const timeInput = document.createElement('input');
timeInput.type = 'range';
timeInput.min = '0'; timeInput.max = '8'; timeInput.step = '0.01'; timeInput.value = '0';
const timeRow = document.createElement('label');
timeRow.className = 'slider-row';
const timeLabel = document.createElement('span');
timeLabel.className = 'slider-label'; timeLabel.textContent = 't';
const timeOutput = document.createElement('output'); timeOutput.textContent = '0.000';
timeRow.append(timeLabel, timeInput, timeOutput);
must<HTMLElement>('time-control').appendChild(timeRow);
timeInput.addEventListener('input', () => {
  time = Number(timeInput.value); playing = false; syncPlayButton(); refresh();
});
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

function syncPlayButton(): void {
  must<HTMLButtonElement>('play').textContent = playing ? 'Pause' : 'Play';
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
