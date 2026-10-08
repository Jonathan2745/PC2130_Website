import * as THREE from 'three';

// Marching tetrahedra: interpolate the density crossing on each tetrahedron edge.
export function densitySurface(n: number, positions: Float32Array, density: Float32Array, level: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  // Split each cube around the same body diagonal so shared faces agree.
  // A tetrahedron intersects a level set in at most a triangle or quadrilateral.
  const tetrahedra = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
  const edges = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
  const id = (x: number, y: number, z: number) => (x * n + y) * n + z;
  for (let x = 0; x < n - 1; x++) for (let y = 0; y < n - 1; y++) for (let z = 0; z < n - 1; z++) {
    const cube = [id(x,y,z), id(x+1,y,z), id(x+1,y+1,z), id(x,y+1,z), id(x,y,z+1), id(x+1,y,z+1), id(x+1,y+1,z+1), id(x,y+1,z+1)];
    for (const tet of tetrahedra) {
      const crossings: THREE.Vector3[] = [];
      for (const [a, b] of edges) {
        const i = cube[tet[a]], j = cube[tet[b]];
        if ((density[i] >= level) === (density[j] >= level)) continue;
        // Crossing fraction from linear interpolation of density along the edge:
        // ρi + f(ρj-ρi) = level, then interpolate the position by the same f.
        const f = (level - density[i]) / (density[j] - density[i]);
        crossings.push(new THREE.Vector3().fromArray(positions, i * 3).lerp(new THREE.Vector3().fromArray(positions, j * 3), f));
      }
      if (crossings.length < 3) continue;
      // Order a four-edge intersection in its plane before fan triangulation;
      // raw edge enumeration would otherwise create crossed or missing triangles.
      if (crossings.length === 4) {
        const center = crossings.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(0.25);
        const u = crossings[0].clone().sub(center).normalize();
        const normal = crossings[1].clone().sub(crossings[0]).cross(crossings[2].clone().sub(crossings[0])).normalize();
        const v = normal.cross(u).normalize();
        crossings.sort((a, b) => Math.atan2(a.clone().sub(center).dot(v), a.clone().sub(center).dot(u)) - Math.atan2(b.clone().sub(center).dot(v), b.clone().sub(center).dot(u)));
      }
      for (let k = 1; k < crossings.length - 1; k++) for (const p of [crossings[0], crossings[k], crossings[k+1]]) vertices.push(p.x, p.y, p.z);
    }
  }
  // Three.js consumes flat xyz triples grouped in triangles. Double-sided
  // materials display both orientations; normals support future lit materials.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}
