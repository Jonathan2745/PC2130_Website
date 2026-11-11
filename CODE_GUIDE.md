# Editing the wavepacket explorer

The project is plain TypeScript + Three.js + Vite. Start with the file matching the change you want. The refactor preserves the existing controls, equations and styling.

## File map

| File | Edit this for |
| --- | --- |
| `src/main.ts` | Startup wiring, view switching, playback, time limits and animation update rate |
| `src/config/defaults.ts` | Initial mass, width, hbar, position, momentum and gravity |
| `src/config/presets.ts` | Dropdown example expressions and the Gaussian insertion button's expression |
| `src/ui/parameter-controls.ts` | Numeric fields and sliders, ranges, steps, velocity/momentum synchronization |
| `src/ui/equation-editor.ts` | Toolbar actions, draft feedback, loading/applying/resetting equations |
| `src/ui/units.ts` | SI reference scales, physical constants and converted value formatting |
| `src/ui/readouts.ts` | Observable display, axis descriptions, legends and explanatory text |
| `src/ui/dom.ts` | Shared element lookup with explicit errors for missing IDs |
| `src/quantum.ts` | Analytic dynamics and expectation values; no DOM or rendering |
| `src/equation.ts` | Default exact wavefunction, expression evaluator and available symbols |
| `src/surface.ts` | Marching-tetrahedra density extraction |
| `src/visualizer.ts` | Camera, scene, axes, surfaces, arrows and each visualization mode |
| `index.html` | Static page sections, buttons, dropdown options, help and element IDs |
| `src/style.css` | CSS imports only; preserve their order |

## Styles

- `src/styles/base-controls.css`: page layout, sidebar, headings, sliders and transport.
- `src/styles/equation.css`: textarea, Apply/Restore buttons, status and variable help.
- `src/styles/scene.css`: canvas layout, scene header, observables and axis note.
- `src/styles/responsive.css`: narrow-screen layout.
- `src/styles/legend.css`: phase toggle, colour key and legend responsive overrides.
- `src/styles/editor-toolbar.css`: presets and insertion toolbar.
- `src/styles/numeric-fields.css`: velocity/component inputs and SI readouts.

The CSS was split without reordering rules, so the original cascade remains intact.

## How the modules communicate

1. `main.ts` creates a fresh parameter object, wavefunction evaluator and renderer.
2. UI setup functions register handlers once. Parameter controls mutate that shared parameter object.
3. Their `onChange` callback tells main to refresh readouts and schedule geometry updates. Units only change SI interpretation and need no geometry rebuild.
4. On each physics update, the visualizer uses the current time and parameters. The readouts then consume the updated position statistics.
5. The renderer draws on every animation frame, including when playback is paused, to support orbit controls.

Modules do not import main. Dependencies flow from main into setup functions, avoiding circular initialization and hidden globals. DOM IDs in HTML must match the IDs used by UI modules.

## Common changes

### Change launch conditions

Edit `createDefaultParams()` in `src/config/defaults.ts`. `p0` is momentum, so velocity is `p0 / mass`. The default is release from rest. If you change this default, also update any hard-coded initial input text in parameter-controls (velocity currently starts at zero).

### Change a slider range

Find its `slider(...)` call in parameter-controls and edit `min`, `max`, or `step`. Controls share a refresh list so coupled momentum/velocity fields stay synchronized. Mass changes preserve launch velocity.

### Add an equation example

Add an entry to `examples` in config/presets and an option with the same value in the HTML `equation-example` select. Loading only changes the draft; Apply commits it.

### Change the appearance of the meshes

In visualizer, edit the `inner`, `outer` and `mean` material/geometry declarations. `updatePosition`, `updateMomentum` and `updateEnergy` implement separate views; `makeAxisLabels` sets axis label appearance. For extraction resolution, edit `GRID_N` and keep the explanatory sampling text/documentation consistent.

### Add an equation variable

Add it to `WavefunctionEquation.scope()` in equation.ts, then update the HTML variable help and EQUATIONS.md. Numerical input alone does not modify custom ψ unless the expression uses that variable.

### Change SI units

Edit reference defaults in ui/units and the corresponding HTML input defaults. The solver stays in model units. Changing displayed reference scales reinterprets the model; it does not convert solver coordinates into SI.

## Verification

```sh
npm run build
node --test tests/surface.test.mjs
npm run dev
```

The geometry tests require a recent Node version supporting TypeScript stripping (Node 22.18+ or 24). In the browser, check linked velocity/momentum fields, mass changes, Cartesian field components, unit values, Apply/Restore, all three views, playback and collapsed sections after relevant edits.

See EQUATIONS.md for the mathematical explanation. This guide is a source file intended to be included in version control; it is not part of the website UI.
