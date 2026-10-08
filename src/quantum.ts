export type Vec3 = { x: number; y: number; z: number };

export interface QuantumParams {
  mass: number;
  sigma: number;
  hbar: number;
  r0: Vec3;
  p0: Vec3;
  gravityMagnitude: number;
  gravityAzimuthDeg: number;
  gravityElevationDeg: number;
}

export interface ObservableState {
  center: Vec3;
  meanMomentum: Vec3;
  gravity: Vec3;
  sigmaT: number;
  sigmaP: number;
  kinetic: number;
  potential: number;
  total: number;
}

// Convert azimuth/elevation into a Cartesian acceleration, with z vertical.
export function gravityVector(params: QuantumParams): Vec3 {
  const az = (params.gravityAzimuthDeg * Math.PI) / 180;
  const el = (params.gravityElevationDeg * Math.PI) / 180;
  const horizontal = params.gravityMagnitude * Math.cos(el);
  return {
    x: horizontal * Math.cos(az),
    y: horizontal * Math.sin(az),
    z: params.gravityMagnitude * Math.sin(el),
  };
}

// Ehrenfest motion is exact for a uniform force: r₀ + p₀t/m + gt²/2.
export function centerAt(t: number, params: QuantumParams): Vec3 {
  const g = gravityVector(params);
  const invM = 1 / params.mass;
  return {
    x: params.r0.x + params.p0.x * invM * t + 0.5 * g.x * t * t,
    y: params.r0.y + params.p0.y * invM * t + 0.5 * g.y * t * t,
    z: params.r0.z + params.p0.z * invM * t + 0.5 * g.z * t * t,
  };
}

// Uniform force shifts the momentum mean by mgt without broadening its density.
export function momentumAt(t: number, params: QuantumParams): Vec3 {
  const g = gravityVector(params);
  return {
    x: params.p0.x + params.mass * g.x * t,
    y: params.p0.y + params.mass * g.y * t,
    z: params.p0.z + params.mass * g.z * t,
  };
}

// Per-coordinate position standard deviation, not the RMS radial distance.
// Free Gaussian dispersion persists in an accelerating frame; gravity translates it.
export function sigmaAt(t: number, params: QuantumParams): number {
  const tau = (params.hbar * t) / (2 * params.mass * params.sigma * params.sigma);
  return params.sigma * Math.sqrt(1 + tau * tau);
}

// These moments belong to the built-in Gaussian, even when custom ψ is displayed.
// <p²> = |<p>|² + 3σp² supplies the kinetic energy of the intrinsic momentum spread.
export function observablesAt(t: number, params: QuantumParams): ObservableState {
  const center = centerAt(t, params);
  const meanMomentum = momentumAt(t, params);
  const gravity = gravityVector(params);
  const sigmaP = params.hbar / (2 * params.sigma);
  const p2 = meanMomentum.x ** 2 + meanMomentum.y ** 2 + meanMomentum.z ** 2;
  const kinetic = p2 / (2 * params.mass) + (3 * sigmaP * sigmaP) / (2 * params.mass);
  const potential = -params.mass * (
    gravity.x * center.x + gravity.y * center.y + gravity.z * center.z
  );
  return {
    center,
    meanMomentum,
    gravity,
    sigmaT: sigmaAt(t, params),
    sigmaP,
    kinetic,
    potential,
    total: kinetic + potential,
  };
}

export function vecLength(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
