# 3D Quantum Projectile Explorer

A direct **Three.js + TypeScript + Vite** visualization of a 3D Gaussian quantum wavepacket moving under a uniform gravitational field.

The default setup follows the PC2130 assignment: a Gaussian wavepacket with an initial center, an average momentum, and a uniform gravitational field. The UI generalizes the assignment so the initial center, momentum, and gravity direction can all be varied in 3D.

See [EQUATIONS.md](EQUATIONS.md) for the full equations, code locations, mesh extraction steps, and equation-editor guide.

## Run it

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

Use Node.js 20.19+.

## Features

- White mean marker, cyan inner wireframe and translucent blue outer density mesh
- Optional position-space phase colouring with a cyclic legend
- Per-coordinate position variance readout
- Adjustable initial center `(x0, y0, z0)`
- Adjustable initial mean momentum `(px0, py0, pz0)`
- Adjustable uniform gravity magnitude, azimuth, and elevation
- Time animation, scrubber, and playback speed
- Position, momentum, and energy diagnostic views
- Classical center-of-packet trajectory overlay
- Gravity and momentum direction arrows
- Live observables: `<r>`, `<p>`, `sigma(t)`, `<K>`, `<V>`, and `<E>`
- Editable complex `psi(x,y,z,t)` expression using Math.js

## Physics used by the default visualization

For a constant gravitational acceleration vector `g`, the potential is

```text
V(r) = -m g · r
```

(up to an arbitrary additive constant), so the force is `F = -grad(V) = m g`.

The expectation-value trajectory is

```text
<r>(t) = r0 + (p0/m)t + (1/2) g t^2
<p>(t) = p0 + m g t
```

and an initially minimum-uncertainty Gaussian has width

```text
sigma(t) = sigma0 sqrt(1 + (hbar t / (2 m sigma0^2))^2)
```

The default expression in the editor is the analytic Gaussian solution obtained by transforming the free-particle Gaussian into a constant-force frame.

## What the three views mean

### Position

The default Gaussian uses exact spheres of radii σ and 2σ centered at the mean. These correspond to density levels exp(-1/2) and exp(-2) times the peak; they are not 68% and 95% enclosed-probability volumes. The white mean marker has an arbitrary display size. Optional colour represents arg(ψ).

Custom equations use marching tetrahedra on a 21³ grid spanning ±4 reference σ per coordinate. Their mean and per-coordinate variance are numerical estimates within that box. Off-box or sub-grid features can be missed, and surfaces crossing the box are clipped. Density surfaces are labelled by their fraction of the sampled peak rather than by σ. The trajectory, arrows and other analytic observables remain Gaussian references.

### Momentum

For the built-in Gaussian, the momentum distribution is Gaussian with

```text
sigma_p = hbar / (2 sigma0)
```

and its center moves according to `<p>(t) = p0 + m g t`.

### Energy

This is an educational **diagnostic** view, not an energy-eigenstate basis or quantum energy distribution. Two planar meshes map one and two units of independent standardized K and V variation into standardized `(K, V, E)` coordinates, where

```text
K = p^2 / (2m)
V = -m g · r
E = K + V
```

## Equation editor scope

The equation editor evaluates a complex-valued `psi(x,y,z,t)`. Useful variables include:

```text
x, y, z, t, i
m, hbar, sigma
x0, y0, z0
px0, py0, pz0
gx, gy, gz
tau, N0
xg, yg, zg
p02, g2, gdotr
xc, yc, zc
pxt, pyt, pzt
sigmaT
```

The editor directly drives the **position-space** rendering. A completely arbitrary edited wavefunction is not automatically Fourier transformed for momentum space and is not numerically propagated under a new arbitrary Hamiltonian. The momentum and energy views therefore remain tied to the analytic Gaussian control parameters.

## Suggested next upgrade

For a more general quantum simulator, replace the analytic propagation with a 3D split-operator FFT solver. Then a second editable box for `V(x,y,z,t)` could numerically evolve arbitrary initial wavefunctions and make all three representations derive from the same state.

## Geometry validation

With Node 22.18+ or 24, run `node --test tests/surface.test.mjs` to check extracted Gaussian radii and the zero-density case.
