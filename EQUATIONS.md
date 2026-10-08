# Equations and the path from ψ to a mesh

This app displays an analytic quantum wavepacket and evaluates custom complex expressions. It does **not** numerically solve the Schrödinger equation for arbitrary initial conditions. The default expression is already its time-dependent solution; a custom expression must supply its own time dependence.

## Code map

| Location | Responsibility |
| --- | --- |
| [`src/quantum.ts`](src/quantum.ts) — `gravityVector`, `centerAt`, `momentumAt`, `sigmaAt`, `observablesAt` | Analytic Gaussian motion, widths and expectation values |
| [`src/equation.ts`](src/equation.ts) — `DEFAULT_EQUATION` | Exact complex Gaussian solution |
| [`src/equation.ts`](src/equation.ts) — `set`, `scope`, `evaluate` | Compile user text, supply symbols, compute density and phase |
| [`src/visualizer.ts`](src/visualizer.ts) — `updatePosition`, `spheres`, `colour` | Density meshes, mean marker, phase colours |
| [`src/surface.ts`](src/surface.ts) — `densitySurface` | Marching-tetrahedra extraction of custom density surfaces |
| [`src/visualizer.ts`](src/visualizer.ts) — `updateMomentum`, `updateEnergy` | Analytic momentum and illustrative energy views |
| [`src/main.ts`](src/main.ts) — editor handlers, `animate`, `updateHUD` | Draft editing, Apply, time substitution and readouts |
| [`index.html`](index.html), [`src/style.css`](src/style.css) | Equation toolbar, help, controls and layout |
| [`tests/surface.test.mjs`](tests/surface.test.mjs) | Checks extracted Gaussian radii and zero-density geometry |

Function names are stable navigation anchors; search them in the indicated files.

## 1. Physical model and symbols

Positions use Cartesian coordinates with **z vertical**. All sliders use mutually consistent model units (no fixed SI unit scale is imposed). The parameters are mass $m$, reduced Planck constant $\hbar$, initial mean position $\mathbf r_0$, initial mean momentum $\mathbf p_0$, initial per-coordinate position standard deviation $\sigma_0$ (`sigma`), and a uniform acceleration $\mathbf g$.

The gravity controls set azimuth $a$ and elevation $e$ in degrees, converted to radians:

$$\mathbf g=|g|(\cos e\cos a,\cos e\sin a,\sin e).$$

The potential, force and governing equation are

$$V(\mathbf r)=-m\mathbf g\cdot\mathbf r,\qquad \mathbf F=-\nabla V=m\mathbf g,$$

$$i\hbar\partial_t\psi=\left[-\frac{\hbar^2}{2m}\nabla^2-m\mathbf g\cdot\mathbf r\right]\psi.$$

There is no floor, collision or reflecting boundary at the displayed grid.

## 2. Default wavefunction

Define the accelerated coordinate $\mathbf R=\mathbf r-\frac12\mathbf g t^2$, dimensionless time $\tau=\hbar t/(2m\sigma_0^2)$, and normalization $N_0=(2\pi\sigma_0^2)^{-3/4}$. The code evaluates

$$\psi(\mathbf r,t)=N_0(1+i\tau)^{-3/2}
\exp\left[-\frac{|\mathbf R-\mathbf r_0-\mathbf p_0t/m|^2}{4\sigma_0^2(1+i\tau)}
+\frac{i}{\hbar}\left(\mathbf p_0\cdot(\mathbf R-\mathbf r_0)-\frac{|\mathbf p_0|^2t}{2m}\right)
+\frac{im}{\hbar}\left((\mathbf g\cdot\mathbf r)t-\frac{|\mathbf g|^2t^3}{6}\right)\right].$$

The first factor and Gaussian exponent give the spreading free packet in the accelerating frame. The initial-momentum phase translates it at velocity $\mathbf p_0/m$. The final phase and accelerated coordinate transform that solution into the uniform-force problem.

In `scope`, `xg/yg/zg` are the components of $\mathbf g t^2/2$, `p02` is $|\mathbf p_0|^2$, `g2` is $|\mathbf g|^2$, and `gdotr` is $\mathbf g\cdot\mathbf r$.

## 3. Motion, spread and observables

`centerAt`, `momentumAt` and `sigmaAt` compute

$$\boldsymbol\mu(t)=\mathbf r_0+\frac{\mathbf p_0}{m}t+\frac12\mathbf g t^2,\qquad
\langle\mathbf p\rangle=\mathbf p_0+m\mathbf g t,$$

$$\sigma(t)=\sigma_0\sqrt{1+\tau^2},\qquad \sigma_p=\frac{\hbar}{2\sigma_0}.$$

Each position-coordinate variance is $\sigma(t)^2$; the total mean squared radial displacement is $3\sigma(t)^2$. Gravity translates the distribution without changing this spreading law.

`observablesAt` uses

$$\langle K\rangle=\frac{|\langle\mathbf p\rangle|^2+3\sigma_p^2}{2m},\qquad
\langle V\rangle=-m\mathbf g\cdot\boldsymbol\mu,\qquad
\langle E\rangle=\langle K\rangle+\langle V\rangle.$$

For the default state the total expectation is constant in time. These momentum/energy readouts and the trajectory remain **Gaussian references** when a custom equation is used. In position view only, the custom position mean and variance are estimated from samples.

## 4. From editor text to probability density

1. The textarea contains a **right-hand-side expression**, using mathjs syntax: `exp(...)`, `i`, `*`, `/`, and `^`. The visible `ψ(x,y,z,t) =` label is not input syntax. Neither LaTeX commands nor a recursive `psi` variable are supported.
2. `WavefunctionEquation.set` compiles the expression once and smoke-tests it at one reference point. Failed compilation leaves the last applied state intact. This is a syntax/evaluation check, not proof of normalization or a valid Schrödinger solution.
3. For each sampled location and time, `scope` supplies slider parameters and derived variables. `evaluate` returns a real number or complex pair $a+ib$.
4. The Born density and phase are $\rho=|\psi|^2=a^2+b^2$ and $\phi=\operatorname{atan2}(b,a)$. Nonfinite real/imaginary components are currently mapped to zero density; avoid singular expressions and excessively large amplitudes. A single smoke test cannot detect every later singularity.
5. `animate` advances time (looping from 8 back to 0), then asks the visualizer to rebuild when playing or controls change. It evaluates the supplied expression at the new time; it does not advance ψ using a PDE solver. Orbit rendering continues while paused.

## 5. From density to the two surfaces

For the built-in Gaussian,

$$\rho(\mathbf r,t)=\frac{\exp[-|\mathbf r-\boldsymbol\mu|^2/(2\sigma(t)^2)]}{(2\pi\sigma(t)^2)^{3/2}}.$$

`updatePosition` recognizes the exact default expression and directly generates spheres: the cyan wireframe has radius $\sigma$, and the translucent blue mesh radius $2\sigma$. The white marker is at the mean and has an arbitrary display radius. It is not another uncertainty surface.

The surfaces have density fractions $e^{-1/2}\approx0.607$ and $e^{-2}\approx0.135$ of the peak. These fractions are **density levels**, not enclosed probabilities. A three-dimensional sphere of radius σ is not the one-dimensional 68% interval.

For a custom expression, `updatePosition` instead evaluates a $21^3$ grid, covering ±4 reference σ around the analytic center in each coordinate. Grid spacing is $8\sigma/20$. The two levels are those same fractions of the **sampled** peak. Custom surfaces need not be spherical or connected, and are not generally standard-deviation contours.

`densitySurface` splits each grid cube into six tetrahedra. An edge with densities on opposite sides of level $L$ crosses the surface at

$$f=\frac{L-\rho_i}{\rho_j-\rho_i},\qquad \mathbf r=\mathbf r_i+f(\mathbf r_j-\mathbf r_i).$$

Three crossings give a triangle; four give a quadrilateral, ordered in its plane and split into two triangles. The resulting xyz vertices become a Three.js `BufferGeometry`. This is piecewise-linear interpolation of a sampled density, not an exact symbolic surface.

## 6. Custom position moments

For uniform samples with density $w_j$, the code estimates

$$\mu_k\approx\frac{\sum_jw_jr_{j,k}}{\sum_jw_j},\qquad
\operatorname{Var}(r_k)\approx\frac{\sum_jw_j(r_{j,k}-\mu_k)^2}{\sum_jw_j}.$$

The common cell-volume factor cancels. These are normalized moments **within the sampled box**. They do not normalize the expression over all space. A zero total gives no mean marker and undefined moments. Peaks outside the box, narrow features, and tails can bias the result; a constant/nondecaying field may have no closed surface at either level. The box follows the analytic reference even if custom ψ is static, so pause near t=0 when exploring the static examples.

## 7. Phase colour

`colour` evaluates phase at mesh vertices and sets linear RGB channels to

$$C_k=0.52+0.48\cos(\phi+2\pi k/3),\qquad k=0,1,2.$$

The cycle wraps at ±π. Transparency and colour-space conversion affect the displayed colour. Phase does not change the mesh geometry: multiplying ψ by a global phase changes colours but leaves density unchanged. Relative phase can change interference when amplitudes are added. Phase colouring is enabled only in position space.

## 8. Momentum and energy meshes

`updateMomentum` draws spheres centered on $\langle\mathbf p\rangle$, with radii $\sigma_p$ and $2\sigma_p$. It does not Fourier-transform custom ψ.

`updateEnergy` draws illustrative planar contours using independent kinetic and potential variations. For the Gaussian reference it uses

$$s_K^2=\frac{|\langle\mathbf p\rangle|^2\sigma_p^2+\tfrac32\sigma_p^4}{m^2},\qquad
s_V=m|\mathbf g|\sigma(t),\qquad s_E=\sqrt{s_K^2+s_V^2}.$$

A disk of radius 2.2 (inner) or 4.4 (outer) in display coordinates $(u,v)$ maps to $(u,v,(s_Ku+s_Vv)/s_E)$. The 2.2 factor is visual scaling, not a physical constant. When gravity is zero, the potential coordinate collapses. These contours are not density isosurfaces, quantiles, or an energy eigenbasis. Actual position-momentum correlations are omitted; do not interpret their spread as the quantum energy uncertainty.

## 9. Writing your own expression

- **exp( )**, **sin( )**, **cos( )**, **√( )** wrap selected text, or insert a selected argument to replace.
- **ψ Gaussian** inserts `exp(-((x-xc)^2+(y-yc)^2+(z-zc)^2)/(4*sigma^2))`. This is an editable Gaussian envelope around the moving reference center, not the exact propagating solution.
- **σ₀**, **ℏ**, **i**, **t** insert the parser names `sigma`, `hbar`, `i`, `t`. Add multiplication signs between factors.
- **Load example** changes only the draft. **Apply equation** commits it; **Restore Gaussian** immediately restores the exact solution.

A static Gaussian envelope is:

```text
exp(-((x-x0)^2+(y-y0)^2+(z-z0)^2)/(4*sigma^2))
```

Multiply it by `exp(i*px0*(x-x0)/hbar)` to add a phase gradient. Add two envelopes to demonstrate interference; amplitudes add **before** taking the squared magnitude. Such examples illustrate density/phase and are not automatically solutions to the uniform-gravity equation.

Available symbols are `x,y,z,t,i,m,hbar,sigma,x0,y0,z0,px0,py0,pz0,gx,gy,gz,tau,N0,xg,yg,zg,p02,g2,gdotr,xc,yc,zc,pxt,pyt,pzt,sigmaT`. The `xc/yc/zc`, `pxt/pyt/pzt`, and `sigmaT` symbols are analytic reference mean position, mean momentum, and width at time t.
