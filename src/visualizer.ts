import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { densitySurface } from './surface';
import { DEFAULT_EQUATION, type WavefunctionEquation } from './equation';
import {
  centerAt,
  gravityVector,
  momentumAt,
  observablesAt,
  sigmaAt,
  type QuantumParams
} from './quantum';

export type ViewMode = 'position' | 'momentum' | 'energy';

const GRID_N = 21;
const POINT_COUNT = GRID_N ** 3;
const POSITION_SPAN_SIGMA = 4;

export class QuantumVisualizer {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(48, 1, 0.01, 2000);
  private renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  private controls: OrbitControls;
  private inner = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: 0x61e7ff, wireframe: true, transparent: true, opacity: 0.65, side: THREE.DoubleSide }));
  private outer = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshBasicMaterial({ color: 0x408dff, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }));
  private mean = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
  private positions = new Float32Array(POINT_COUNT * 3);
  private densities = new Float32Array(POINT_COUNT);
  phaseColour = false;
  positionStats: { mean: THREE.Vector3; variance: THREE.Vector3 } | null = null;
  private gravityArrow: THREE.ArrowHelper;
  private trajectory: THREE.Line;
  private momentumArrow: THREE.ArrowHelper;
  private grid: THREE.GridHelper;
  private lastView: ViewMode = 'position';
  private lastTarget = new THREE.Vector3();
  constructor(mount: HTMLElement) {
    this.scene.background = new THREE.Color(0x07101d);
    this.scene.fog = new THREE.FogExp2(0x07101d, 0.014);

    this.camera.up.set(0, 0, 1);
    this.camera.position.set(10, -12, 8);

    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.target.set(0, 0, 2);

    const axes = new THREE.AxesHelper(4);
    this.scene.add(axes);

    this.grid = new THREE.GridHelper(30, 30, 0x29435e, 0x182a3d);
    this.grid.rotation.x = Math.PI / 2;
    this.grid.position.z = 0;
    this.scene.add(this.grid);

    this.scene.add(this.outer, this.inner, this.mean);
    this.mean.renderOrder = 10;

    this.gravityArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 2, 0xffca65, 0.42, 0.25);
    this.scene.add(this.gravityArrow);

    this.momentumArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 2, 0x61e7ff, 0.42, 0.25);
    this.scene.add(this.momentumArrow);

    const trajectoryGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 0.01)]);
    this.trajectory = new THREE.Line(
      trajectoryGeometry,
      new THREE.LineBasicMaterial({ color: 0x8ea9c9, transparent: true, opacity: 0.65 }),
    );
    this.scene.add(this.trajectory);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = Math.max(0.1, width / Math.max(1, height));
      this.camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(mount);
    resize();
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  update(view: ViewMode, t: number, params: QuantumParams, equation: WavefunctionEquation): void {
    if (view !== this.lastView) {
      this.reframe(view, t, params);
      this.lastView = view;
    }

    this.gravityArrow.visible = view === 'position';
    this.trajectory.visible = view === 'position';
    this.grid.visible = view === 'position';
    this.momentumArrow.visible = view === 'momentum';

    if (view === 'position') this.updatePosition(t, params, equation);
    else if (view === 'momentum') this.updateMomentum(t, params);
    else this.updateEnergy(t, params);

  }

  private replaceGeometry(mesh: THREE.Mesh, geometry: THREE.BufferGeometry): void {
    mesh.geometry.dispose();
    mesh.geometry = geometry;
  }

  private spheres(center: THREE.Vector3, sigma: number): void {
    this.replaceGeometry(this.inner, new THREE.SphereGeometry(sigma, 32, 20).translate(center.x, center.y, center.z));
    this.replaceGeometry(this.outer, new THREE.SphereGeometry(2 * sigma, 40, 24).translate(center.x, center.y, center.z));
    this.mean.position.copy(center);
    this.mean.visible = true;
  }

  private colour(t: number, params: QuantumParams, equation?: WavefunctionEquation): void {
    for (const mesh of [this.inner, this.outer]) {
      const vertexColours = this.phaseColour && !!equation;
      if (mesh.material.vertexColors !== vertexColours) mesh.material.needsUpdate = true;
      mesh.material.vertexColors = vertexColours;
      mesh.material.color.set(mesh.material.vertexColors ? 0xffffff : mesh === this.inner ? 0x61e7ff : 0x408dff);
      if (!mesh.material.vertexColors || !equation) continue;
      const positions = mesh.geometry.getAttribute('position');
      const colours = new Float32Array(positions.count * 3);
      for (let i = 0; i < positions.count; i++) {
        const phase = equation.evaluate(positions.getX(i), positions.getY(i), positions.getZ(i), t, params).phase;
        for (let channel = 0; channel < 3; channel++) colours[i * 3 + channel] = 0.52 + 0.48 * Math.cos(phase + channel * 2 * Math.PI / 3);
      }
      mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    }
  }

  private updatePosition(t: number, params: QuantumParams, equation: WavefunctionEquation): void {
    const center = centerAt(t, params);
    const sigmaT = sigmaAt(t, params);
    const mean = new THREE.Vector3(center.x, center.y, center.z);
    // For the exact Gaussian, equal-density surfaces are spheres: density/peak
    // = exp(-r²/(2σ²)). Radii σ and 2σ correspond to exp(-1/2) and exp(-2).
    // This shortcut avoids resampling a shape whose geometry we know analytically.
    if (equation.value === DEFAULT_EQUATION) {
      this.spheres(mean, sigmaT);
      this.positionStats = { mean, variance: new THREE.Vector3().setScalar(sigmaT ** 2) };
    } else {
      // Custom ψ can have lobes/nodes, so sample a scalar density field on a 21³
      // lattice. The box follows the analytic reference, not the custom mean.
      // Its spacing is 8σ/20; features finer than that or outside the box are lost.
      let index = 0, maxDensity = 0, total = 0;
      const weighted = new THREE.Vector3();
      for (let ix = 0; ix < GRID_N; ix++) for (let iy = 0; iy < GRID_N; iy++) for (let iz = 0; iz < GRID_N; iz++) {
        const point = new THREE.Vector3(ix, iy, iz).multiplyScalar(2 * POSITION_SPAN_SIGMA / (GRID_N - 1)).addScalar(-POSITION_SPAN_SIGMA).multiplyScalar(sigmaT).add(mean);
        const density = equation.evaluate(point.x, point.y, point.z, t, params).density;
        point.toArray(this.positions, index * 3);
        this.densities[index++] = density;
        maxDensity = Math.max(maxDensity, density);
        total += density;
        weighted.addScaledVector(point, density);
      }
      this.positionStats = null;
      this.mean.visible = total > 0;
      if (total > 0) {
        // Equal-volume samples: ΔV cancels between numerator and denominator.
        // This normalizes moments inside the sampled box, not ψ over all space.
        weighted.divideScalar(total);
        // Componentwise central second moment: Σρ(r-mean)² / Σρ.
        const variance = new THREE.Vector3();
        for (let i = 0; i < POINT_COUNT; i++) {
          const delta = new THREE.Vector3().fromArray(this.positions, i * 3).sub(weighted);
          variance.addScaledVector(delta.multiply(delta), this.densities[i] / total);
        }
        this.positionStats = { mean: weighted, variance };
        this.mean.position.copy(weighted);
      }
      // Extract two level sets. These density fractions are not enclosed masses
      // and cannot in general be called σ/2σ surfaces for arbitrary wavefunctions.
      this.replaceGeometry(this.inner, densitySurface(GRID_N, this.positions, this.densities, maxDensity * Math.exp(-0.5)));
      this.replaceGeometry(this.outer, densitySurface(GRID_N, this.positions, this.densities, maxDensity * Math.exp(-2)));
    }
    // Evaluate arg(ψ) at mesh vertices only when phase colouring is enabled.
    // Geometry still depends solely on |ψ|²; global phase changes only the colours.
    this.colour(t, params, equation);

    const g = gravityVector(params);
    const gLen = Math.hypot(g.x, g.y, g.z);
    this.gravityArrow.position.set(center.x, center.y, center.z);
    if (gLen > 1e-8) {
      this.gravityArrow.setDirection(new THREE.Vector3(g.x, g.y, g.z).normalize());
      this.gravityArrow.setLength(Math.min(4, 0.8 + Math.log1p(gLen)), 0.4, 0.25);
      this.gravityArrow.visible = true;
    } else {
      this.gravityArrow.visible = false;
    }

    const trajectoryPoints: THREE.Vector3[] = [];
    const steps = 80;
    const end = Math.max(0.01, t);
    for (let i = 0; i <= steps; i++) {
      const c = centerAt((end * i) / steps, params);
      trajectoryPoints.push(new THREE.Vector3(c.x, c.y, c.z));
    }
    this.trajectory.geometry.dispose();
    this.trajectory.geometry = new THREE.BufferGeometry().setFromPoints(trajectoryPoints);

    this.softFollow(new THREE.Vector3(center.x, center.y, center.z));
  }

  private updateMomentum(t: number, params: QuantumParams): void {
    const p = momentumAt(t, params);
    const sigmaP = params.hbar / (2 * params.sigma);
    this.spheres(new THREE.Vector3(p.x, p.y, p.z), sigmaP);
    this.colour(t, params);
    const pLen = Math.hypot(p.x, p.y, p.z);
    this.momentumArrow.position.set(p.x, p.y, p.z);
    if (pLen > 1e-8) {
      this.momentumArrow.setDirection(new THREE.Vector3(p.x, p.y, p.z).normalize());
      this.momentumArrow.setLength(Math.min(4, 0.8 + Math.log1p(pLen)), 0.4, 0.25);
      this.momentumArrow.visible = true;
    } else {
      this.momentumArrow.visible = false;
    }
    this.softFollow(new THREE.Vector3(p.x, p.y, p.z));
  }

  private updateEnergy(t: number, params: QuantumParams): void {
    const o = observablesAt(t, params);
    // Gaussian diagnostic: independent K and V variations mapped into K + V = E.
    const p2 = o.meanMomentum.x ** 2 + o.meanMomentum.y ** 2 + o.meanMomentum.z ** 2;
    const sk = Math.sqrt((p2 * o.sigmaP ** 2 + 1.5 * o.sigmaP ** 4) / params.mass ** 2);
    const su = params.mass * Math.hypot(o.gravity.x, o.gravity.y, o.gravity.z) * o.sigmaT;
    // Independence is a diagnostic assumption. The true evolved quantum state
    // has position-momentum correlations, so this is not its energy distribution.
    const se = Math.hypot(sk, su);
    for (const [mesh, radius] of [[this.inner, 1], [this.outer, 2]] as const) {
      const geometry = new THREE.CircleGeometry(radius * 2.2, 64);
      const position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = su > 1e-10 ? position.getY(i) : 0;
        position.setXYZ(i, x, y, (sk * x + su * y) / se);
      }
      geometry.computeVertexNormals();
      this.replaceGeometry(mesh, geometry);
    }
    this.mean.position.set(0, 0, 0);
    this.mean.visible = true;
    this.colour(t, params);
    this.softFollow(new THREE.Vector3(0, 0, 0));
  }

  private reframe(view: ViewMode, t: number, params: QuantumParams): void {
    let target = new THREE.Vector3();
    if (view === 'position') {
      const c = centerAt(t, params);
      target = new THREE.Vector3(c.x, c.y, c.z);
    } else if (view === 'momentum') {
      const p = momentumAt(t, params);
      target = new THREE.Vector3(p.x, p.y, p.z);
    }
    this.controls.target.copy(target);
    this.lastTarget.copy(target);
    const offset = view === 'energy' ? new THREE.Vector3(9, -11, 8) : new THREE.Vector3(8, -10, 7);
    this.camera.position.copy(target).add(offset);
    this.controls.update();
  }

  private softFollow(target: THREE.Vector3): void {
    const delta = target.clone().sub(this.lastTarget);
    if (delta.lengthSq() > 1e-8) {
      this.camera.position.add(delta);
      this.controls.target.add(delta);
      this.lastTarget.copy(target);
    }
  }
}
