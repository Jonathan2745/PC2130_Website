import { compile, type EvalFunction } from 'mathjs';
import { centerAt, gravityVector, momentumAt, sigmaAt, type QuantumParams } from './quantum';

// Exact solution for an initially uncorrelated, isotropic Gaussian under V=-m g·r.
// See EQUATIONS.md for the accelerated-frame derivation and each symbol.
// The complex width (1+i*tau) produces both spreading and a spatial phase chirp.
export const DEFAULT_EQUATION = `N0 * (1 + i*tau)^(-1.5) * exp(
  -(((x-xg)-x0-px0*t/m)^2 + ((y-yg)-y0-py0*t/m)^2 + ((z-zg)-z0-pz0*t/m)^2)
    /(4*sigma^2*(1+i*tau))
  + i*(px0*((x-xg)-x0) + py0*((y-yg)-y0) + pz0*((z-zg)-z0) - p02*t/(2*m))/hbar
  + i*m*(gdotr*t - g2*t^3/6)/hbar
)`;

export interface PsiValue {
  density: number;
  phase: number;
}

export class WavefunctionEquation {
  private compiled: EvalFunction;
  private expression = DEFAULT_EQUATION;

  constructor() {
    this.compiled = compile(this.expression);
  }

  get value(): string {
    return this.expression;
  }

  set(expression: string): void {
    // mathjs parses mathematical syntax (including complex arithmetic) into a
    // reusable evaluator. This is an expression, not JavaScript or a PDE solver.
    const candidate = compile(expression);
    // Smoke-test the expression before accepting it.
    candidate.evaluate(this.scope(0, 0, 0, 0, {
      mass: 1,
      sigma: 0.7,
      hbar: 1,
      r0: { x: 0, y: 0, z: 3 },
      p0: { x: 2, y: 0, z: 0 },
      gravityMagnitude: 1,
      gravityAzimuthDeg: 0,
      gravityElevationDeg: -90,
    }));
    // Commit only after validation, preserving the previous state on a parse error.
    this.compiled = candidate;
    this.expression = expression;
  }

  reset(): void {
    this.set(DEFAULT_EQUATION);
  }

  evaluate(x: number, y: number, z: number, t: number, params: QuantumParams): PsiValue {
    const value = this.compiled.evaluate(this.scope(x, y, z, t, params)) as unknown;
    let re: number;
    let im: number;

    if (typeof value === 'number') {
      re = value;
      im = 0;
    } else if (value && typeof value === 'object' && 're' in value && 'im' in value) {
      re = Number((value as { re: unknown }).re);
      im = Number((value as { im: unknown }).im);
    } else {
      const n = Number(value);
      re = n;
      im = 0;
    }

    if (!Number.isFinite(re) || !Number.isFinite(im)) {
      return { density: 0, phase: 0 };
    }

    // Born density is |ψ|² = Re(ψ)² + Im(ψ)², not the complex amplitude itself.
    // atan2 retains the quadrant and returns phase in [-π, π] for the colour cycle.
    return {
      density: re * re + im * im,
      phase: Math.atan2(im, re),
    };
  }

  // Rebuild the symbol table for this sample: coordinates/time vary, sliders set
  // physical parameters, and analytic helpers supply the Gaussian reference frame.
  // A custom expression must explicitly use t if its shape is to evolve with time.
  private scope(x: number, y: number, z: number, t: number, params: QuantumParams): Record<string, number> {
    const g = gravityVector(params);
    const center = centerAt(t, params);
    const p = momentumAt(t, params);
    const tau = (params.hbar * t) / (2 * params.mass * params.sigma * params.sigma);
    const N0 = Math.pow(2 * Math.PI * params.sigma * params.sigma, -0.75);
    const p02 = params.p0.x ** 2 + params.p0.y ** 2 + params.p0.z ** 2;
    const g2 = g.x ** 2 + g.y ** 2 + g.z ** 2;
    const gdotr = g.x * x + g.y * y + g.z * z;

    return {
      x,
      y,
      z,
      t,
      m: params.mass,
      hbar: params.hbar,
      sigma: params.sigma,
      x0: params.r0.x,
      y0: params.r0.y,
      z0: params.r0.z,
      px0: params.p0.x,
      py0: params.p0.y,
      pz0: params.p0.z,
      gx: g.x,
      gy: g.y,
      gz: g.z,
      tau,
      N0,
      xg: 0.5 * g.x * t * t,
      yg: 0.5 * g.y * t * t,
      zg: 0.5 * g.z * t * t,
      p02,
      g2,
      gdotr,
      xc: center.x,
      yc: center.y,
      zc: center.z,
      pxt: p.x,
      pyt: p.y,
      pzt: p.z,
      sigmaT: sigmaAt(t, params),
    };
  }
}
