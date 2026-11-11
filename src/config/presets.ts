/** EDIT HERE: example wavefunctions and the Gaussian toolbar insertion.
 * Preset keys must match the option values in index.html. */
import { DEFAULT_EQUATION } from "../equation";
export const envelope = 'exp(-((x-xc)^2+(y-yc)^2+(z-zc)^2)/(4*sigma^2))';
const staticEnvelope = 'exp(-((x-x0)^2+(y-y0)^2+(z-z0)^2)/(4*sigma^2))';
export const examples: Record<string, string> = {
  gaussian: DEFAULT_EQUATION,
  envelope: staticEnvelope,
  lobes: 'exp(-((x-x0-0.9)^2+(y-y0)^2+(z-z0)^2)/(4*sigma^2)) + exp(-((x-x0+0.9)^2+(y-y0)^2+(z-z0)^2)/(4*sigma^2))',
  phase: `${staticEnvelope} * exp(i*(px0*(x-x0)+py0*(y-y0)+pz0*(z-z0))/hbar)`,
};
