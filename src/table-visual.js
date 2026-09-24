// import * as THREE from 'three';
// import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
// import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// import { CUSHION_PROFILE, RAIL_TOP } from './table-model.js';
// import { HALF_X as X, HALF_Z as Z, OUTER_X, OUTER_Z, CLOTH_Y as Y, RADIUS, CUSHIONS, POCKET_DETAILS, pocketPoint, pocketCoordinates, HEAD_STRING_X, FOOT_SPOT_X } from './table-model.js';

// // Includes the inset sights and the soft leather lip; used for physical cue clearance.
// export const RAIL_SURFACE_Y = Y + RAIL_TOP;

// export function texture(width, height, paint) {
//   const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
//   paint(canvas.getContext('2d'), width, height);
//   const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
//   return map;
// }
// function path(points, hole = false) {
//   const p = hole ? new THREE.Path() : new THREE.Shape();
//   points.forEach(([x, z], i) => i ? p.lineTo(x, -z) : p.moveTo(x, -z));
//   p.closePath(); return p;
// }
// function rounded(x, z, radius) {
//   const s = new THREE.Shape();
//   s.moveTo(-x + radius, -z); s.lineTo(x - radius, -z); s.quadraticCurveTo(x, -z, x, -z + radius);
//   s.lineTo(x, z - radius); s.quadraticCurveTo(x, z, x - radius, z);
//   s.lineTo(-x + radius, z); s.quadraticCurveTo(-x, z, -x, z - radius);
//   s.lineTo(-x, -z + radius); s.quadraticCurveTo(-x, -z, -x + radius, -z);
//   return s;
// }
// function roundedPocketOutline(p) {
//   // Soften the two shelf corners while keeping the opening aligned with the jaws.
//   const shape=new THREE.Shape(),points=p.outline;
//   points.forEach(([x,z],i)=>{
//     const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];
//     const da=Math.hypot(a[0]-x,a[1]-z),db=Math.hypot(b[0]-x,b[1]-z);
//     const r=Math.min(.07,da*.45,db*.45);
//     const entry=[x+(a[0]-x)*r/da,z+(a[1]-z)*r/da];
//     const exit=[x+(b[0]-x)*r/db,z+(b[1]-z)*r/db];
//     if(i===0)shape.moveTo(...entry);else shape.lineTo(...entry);
//     shape.quadraticCurveTo(x,z,...exit);
//   });
//   shape.closePath();return shape.getPoints(8).map(v=>[v.x,v.y]);
// }
// function slab(shape, depth, bevel = 0) {
//   const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, steps: 1, curveSegments: 32 });
//   geometry.rotateX(-Math.PI / 2); return geometry;
// }
// function facesGeometry(faces) {
//   const vertices = [], uv = [];
//   for (const points of faces) for (let i = 1; i < points.length - 1; i++) {
//     for (const p of [points[0], points[i], points[i + 1]]) {
//       vertices.push(...p); uv.push(p[0], p[2]);
//     }
//   }
//   const geometry = new THREE.BufferGeometry();
//   geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
//   geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
//   geometry.computeVertexNormals();
//   return geometry;
// }

// function cushionGeometry(c) {
//   // A small rounded nose is the foremost contact point. The covered rubber slopes
//   // back into the rail; it is not a single, broad triangular prism.
//   const noseHeight = 2 * RADIUS * 0.635;
//   const profile = CUSHION_PROFILE;
//   const length = Math.hypot(c.nose[1][0] - c.nose[0][0], c.nose[1][1] - c.nose[0][1]);
//   const along = [(c.nose[1][0] - c.nose[0][0]) / length, (c.nose[1][1] - c.nose[0][1]) / length];
//   const sections = profile.map(([t, h]) => c.nose.map((nose, i) => {
//     // Keep the measured mouth at nose height; draft the rubber facing vertically.
//     // 14° back draft: the facing opens below the nose and directs impacts down.
//     const cutback = (noseHeight - h) * Math.tan(14 * Math.PI / 180) * (i === 0 ? 1 : -1);
//     return [
//       THREE.MathUtils.lerp(nose[0], c.back[i][0], t) + along[0] * cutback, Y + h,
//       THREE.MathUtils.lerp(nose[1], c.back[i][1], t) + along[1] * cutback,
//     ];
//   }));
//   const position = [], uv = [], indices = [];
//   for (const section of sections) for (const p of section) {
//     position.push(...p); uv.push(p[0], p[2]);
//   }
//   for (let i = 0; i < sections.length; i++) {
//     const a = i * 2, b = ((i + 1) % sections.length) * 2;
//     indices.push(a, a + 1, b + 1, a, b + 1, b);
//   }
//   const body = new THREE.BufferGeometry();
//   body.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
//   body.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
//   body.setIndex(indices); body.computeVertexNormals();
//   // Separate caps preserve the cut facing's crease instead of averaging its normal
//   // into the long playing face. Triangulate the concave profile, including its toe.
//   const contour = profile.map(([t, h]) => new THREE.Vector2(t, h));
//   const triangles = THREE.ShapeUtils.triangulateShape(contour, []), ends = [];
//   for (let end = 0; end < 2; end++) for (const triangle of triangles) {
//     ends.push(triangle.map(i => sections[i][end]));
//   }
//   return { body, facings: facesGeometry(ends) };
// }

// function pocketCollar(p, from, to, radius) {
//   // Rolled leather around the exposed back of the pocket, with a dark vertical
//   // throat below. The front stays open and keeps the original slate shelf.
//   const vertices = [], indices = [], steps = 96;
//   const crossSection = [
//     [radius - 0.012, 0.155], [radius - 0.012, 0.177],
//     [radius - 0.006, 0.188], [radius + 0.006, 0.196],
//     [radius + 0.020, 0.198], [radius + 0.033, 0.192],
//     [radius + 0.041, 0.180], [radius + 0.042, 0.160],
//   ];
//   for (let i = 0; i <= steps; i++) {
//     const angle = THREE.MathUtils.lerp(from, to, i / steps);
//     for (const [r, height] of crossSection) {
//       const [x, z] = pocketPoint(p, Math.cos(angle) * r, p.roundCenter + Math.sin(angle) * r);
//       vertices.push(x, Y + height, z);
//     }
//   }
//   const count = crossSection.length;
//   for (let i = 0; i < steps; i++) for (let j = 0; j < count - 1; j++) {
//     const a = i * count + j, b = a + count;
//     indices.push(a, b, b + 1, a, b + 1, a + 1);
//   }
//   const geometry = new THREE.BufferGeometry();
//   geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
//   geometry.setIndex(indices); geometry.computeVertexNormals();
//   return geometry;
// }

// export function buildTournamentTable(scene, renderer) {
//   const staticMeshes = [];
//   const add = (geometry, material, y = 0) => {
//     const mesh = new THREE.Mesh(geometry, material); mesh.position.y = y;
//     mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); staticMeshes.push(mesh); return mesh;
//   };
//   const box = (w, h, d, mat, x, y, z, r = 0.025) => {
//     const mesh = add(new RoundedBoxGeometry(w, h, d, 4, r), mat, y); mesh.position.set(x, y, z); return mesh;
//   };
//   const black = new THREE.MeshStandardMaterial({ color: '#171c1e', roughness: 0.78, metalness: 0.05, envMapIntensity: 0.2, side: THREE.DoubleSide });
//   const cabinet = new THREE.MeshStandardMaterial({ color: '#101519', roughness: 0.35, metalness: 0.22 });
//   const silver = new THREE.MeshStandardMaterial({ color: '#869198', roughness: 0.42, metalness: 0.72, side: THREE.DoubleSide });
//   const leather = new THREE.MeshStandardMaterial({ color: '#080a0b', roughness: 0.76, side: THREE.DoubleSide });
//   const leatherRim = new THREE.MeshStandardMaterial({ color: '#a6aaa6', roughness: 0.72, metalness:0.08, envMapIntensity:0.15, side: THREE.DoubleSide });
//   const pocketBase = new THREE.MeshBasicMaterial({ color: '#010203', side: THREE.DoubleSide });

//   // A hollow cabinet: falling balls remain inside a real cavity instead of a painted black disk.
//   const shell = rounded(OUTER_X - 0.05, OUTER_Z - 0.05, 0.40);
//   // Clear the whole pocket well, including the back of the side pockets. A narrow
//   // cabinet opening otherwise shows a solid horizontal ledge through the hole.
//   shell.holes.push(rounded(X + 0.53, Z + 0.53, 0.24));
//   add(slab(shell, 0.64, 0.025), cabinet, -0.72);
//   const trim = rounded(OUTER_X, OUTER_Z, 0.43);
//   trim.holes.push(rounded(OUTER_X - 0.045, OUTER_Z - 0.045, 0.395));
//   add(slab(trim, 0.035), silver, -0.075);
//   for (const x of [-3.55, 3.55]) for (const z of [-1.55, 1.55]) {
//     box(0.44, 0.86, 0.48, cabinet, x, -1.06, z, 0.07);
//     box(0.48, 0.07, 0.52, silver, x, -1.48, z, 0.025);
//   }

//   const feltTexture = texture(512, 512, (ctx, w, h) => {
//     const data = ctx.createImageData(w, h);
//     // Low-contrast, aperiodic fibers; mipmaps average the grain at playing distance.
//     for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
//       const hash = Math.imul(x + y * w + 1, 1597334677) ^ Math.imul(x + 13, 3812015801);
//       const i = (y * w + x) * 4, shade = 239 + ((hash >>> 16) % 11) + 2 * Math.sin(x * .037) * Math.sin(y * .029);
//       data.data[i] = data.data[i + 1] = data.data[i + 2] = shade; data.data[i + 3] = 255;
//     }
//     ctx.putImageData(data, 0, 0);
//   });
//   feltTexture.wrapS = feltTexture.wrapT = THREE.RepeatWrapping; feltTexture.repeat.set(.75, .75);
//   feltTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
//   // Cloth is diffuse. Vertex lighting avoids costly glossy/bump shading across
//   // most of the viewport, while the rounded cushion normals retain their volume.
//   const felt = new THREE.MeshLambertMaterial({ color: '#164d64', map: feltTexture });
//   // Stable broad illumination and a narrow cushion contact falloff, evaluated
//   // from table coordinates. No moving shadow or per-frame image accumulation.
//   felt.onBeforeCompile = shader => {
//     shader.vertexShader = 'varying vec3 vTablePoint;\n' + shader.vertexShader;
//     shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTablePoint = (modelMatrix * vec4(transformed, 1.0)).xyz;');
//     shader.fragmentShader = 'varying vec3 vTablePoint;\n' + shader.fragmentShader;
//     shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
//       vec2 tablePoint = vTablePoint.xz;
//       float railDistance = min(${X.toFixed(2)} - abs(tablePoint.x), ${Z.toFixed(2)} - abs(tablePoint.y));
//       float cushionShade = mix(0.95, 1.0, smoothstep(0.0, 0.07, railDistance));
//       diffuseColor.rgb *= cushionShade;`);
//   };
//   const cushion = new THREE.MeshLambertMaterial({ color: '#343a3d', emissive: '#343a3d', emissiveIntensity: 0.22, map: feltTexture, side: THREE.DoubleSide });
//   const bed = rounded(X + 0.53, Z + 0.53, 0.10);
//   const pocketOutlines=POCKET_DETAILS.map(roundedPocketOutline);
//   for (const outline of pocketOutlines) bed.holes.push(path(outline, true));
//   const slate = add(slab(bed, 0.15), new THREE.MeshStandardMaterial({ color: '#1c2529', roughness: 0.9 }), Y - 0.155);
//   slate.castShadow = false;
//   const cloth = add(new THREE.ShapeGeometry(bed, 32), felt, Y);
//   cloth.rotation.x = -Math.PI / 2; cloth.castShadow = false; cloth.receiveShadow = false;
//   const markingMaterial = new THREE.MeshBasicMaterial({ color: '#e0e5dc', transparent: true, opacity: 0.17, depthWrite: false });
//   const markings = new THREE.Group(); markings.name = 'table-markings';
//   for (const [x, z, width, length] of [[HEAD_STRING_X, 0, 0.009, Z * 2], [FOOT_SPOT_X + 0.07, 0, 0.52, 0.009], [FOOT_SPOT_X, 0, 0.009, 0.34], [(HEAD_STRING_X-X)/2, -Z/2, X+HEAD_STRING_X, 0.009], [(HEAD_STRING_X-X)/2, Z/2, X+HEAD_STRING_X, 0.009]]) {
//     const mark = new THREE.Mesh(new THREE.PlaneGeometry(width, length), markingMaterial);
//     mark.rotation.x = -Math.PI / 2; mark.position.set(x, Y + 0.002, z); markings.add(mark);
//   }
//   scene.add(markings);

//   // The nose and jaw positions are shared with physics; only the rubber's vertical
//   // profile changes. Soft normals round the nose while the pocket cuts stay crisp.
//   for (const c of CUSHIONS) {
//     const geometry = cushionGeometry(c);
//     const body=add(geometry.body, cushion);body.name = 'cushion-profile';body.receiveShadow=false;
//     const facings=add(geometry.facings, cushion);facings.name = 'cushion-pocket-facings';facings.receiveShadow=false;
//   }

//   // Six lacquered rail sections and inset sights.
//   for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
//     const start = 0.43, end = X - 0.50;
//     box(end - start, 0.14, 0.42, black, sx * (start + end) / 2, Y + 0.115, sz * (Z + 0.55), 0.018);
//   }
//   for (const sx of [-1, 1]) box(0.42, 0.14, 2 * (Z - 0.5), black, sx * (X + 0.55), Y + 0.115, 0, 0.018);

//   // Cast corner caps. The inside edge follows the back of the pocket, leaving a U-shaped mouth.
//   for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
//     const outline = [[-0.50, 0.76], [0.34, 0.76]];
//     for (let i = 1; i <= 24; i++) {
//       const a = Math.PI / 2 - i / 24 * Math.PI / 2;
//       outline.push([0.34 + Math.cos(a) * 0.42, 0.34 + Math.sin(a) * 0.42]);
//     }
//     outline.push([0.76, -0.50], [0.34, -0.50], [0.34, 0.065]);
//     // The cap ends at the BACK of each facing, never intruding over the sloped cloth.
//     const canonical = POCKET_DETAILS.find(p => p.x === X && p.z === Z);
//     for (let i = 0; i <= 24; i++) {
//       const angle = 0.85 + i / 24 * (Math.PI - 1.70);
//       const radius = canonical.width + 0.021;
//       const [x, z] = pocketPoint(canonical, radius * Math.cos(angle), canonical.roundCenter + radius * Math.sin(angle));
//       outline.push([x - X, z - Z]);
//     }
//     outline.push([0.065, 0.34], [-0.50, 0.34]);
//     const cap = add(slab(path(outline.map(([x, z]) => [sx * (X + x), sz * (Z + z)])), 0.125, 0.009), silver, Y + 0.045);
//     cap.name = 'corner-pocket-cap';
//   }
//   for (const p of POCKET_DETAILS.filter(p => p.side)) {
//     const coords = [[-0.43, 0.76], [0.43, 0.76], [0.43, 0.34]];
//     const radius = p.width + 0.021;
//     const start = Math.asin((0.34 - p.roundCenter) / radius);
//     for (let i = 0; i <= 24; i++) {
//       const angle = start + i / 24 * (Math.PI - 2 * start);
//       coords.push([radius * Math.cos(angle), p.roundCenter + radius * Math.sin(angle)]);
//     }
//     coords.push([-0.43, 0.34]);
//     add(slab(path(coords.map(([l, d]) => pocketPoint(p, l, d))), 0.125, 0.009), silver, Y + 0.045).name = 'side-pocket-cap';
//   }
//   for (const [pocketIndex,p] of POCKET_DETAILS.entries()) {
//     const faces = [];
//     const center = pocketPoint(p, 0, p.roundCenter - 0.03);
//     // Slate extrusion and leather must not share a plane: the lining sits just
//     // inside the cut so their surfaces cannot flicker against one another.
//     const lining = pocketOutlines[pocketIndex].map(([x, z]) => {
//       const distance = Math.hypot(center[0] - x, center[1] - z);
//       return [x + (center[0] - x) / distance * 0.004, z + (center[1] - z) / distance * 0.004];
//     });
//     lining.forEach((a, i) => {
//       const b = lining[(i + 1) % lining.length];
//       // Keep the liner below the sloped facings; only its curved back reaches rail height.
//       const topAt = point => Y - 0.004 + Math.max(0, Math.min(1, (pocketCoordinates(p, ...point).depth - p.roundCenter) / p.width)) * 0.165;
//       faces.push([[a[0], topAt(a), a[1]], [b[0], topAt(b), b[1]], [b[0], -0.64, b[1]], [a[0], -0.64, a[1]]]);
//     });
//     const liner = add(facesGeometry(faces), leather); liner.name = 'pocket-liner';
//     const radius = p.width + 0.021;
//     const start = -.20;
//     const collar = add(pocketCollar(p, start, Math.PI - start, radius), leatherRim);
//     collar.name = 'pocket-rounded-collar';
//     const base = add(new THREE.ShapeGeometry(path(pocketOutlines[pocketIndex])), pocketBase, -0.63);
//     base.rotation.x = -Math.PI / 2;
//   }
//   const sightMaterial = new THREE.MeshBasicMaterial({ color: '#f0eee1' });
//   const sight = (x, z) => {
//     const m = add(new THREE.CircleGeometry(0.026, 48), sightMaterial, Y + 0.190);
//     m.rotation.x=-Math.PI/2;m.position.x=x;m.position.z=z;m.castShadow=m.receiveShadow=false;
//   };
//   for (const z of [-Z - 0.55, Z + 0.55]) for (const x of [-3.3, -2.2, -1.1, 1.1, 2.2, 3.3]) sight(x, z);
//   for (const x of [-X - 0.55, X + 0.55]) for (const z of [-1.1, 0, 1.1]) sight(x, z);
//   // Batch the static table by material/shadow state. Keep balls and cue separate.
//   const batches = new Map();
//   for (const mesh of staticMeshes) {
//     const key = `${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}`;
//     if (!batches.has(key)) batches.set(key, []);
//     batches.get(key).push(mesh);
//   }
//   for (const meshes of batches.values()) {
//     if (meshes.length < 2) continue;
//     const geometries = meshes.map(mesh => {
//       mesh.updateMatrix();
//       const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
//       return geometry.applyMatrix4(mesh.matrix);
//     });
//     const merged = new THREE.Mesh(mergeGeometries(geometries, false), meshes[0].material);
//     merged.name = 'table-static-batch'; merged.castShadow = meshes[0].castShadow; merged.receiveShadow = meshes[0].receiveShadow;
//     scene.add(merged);
//     for (const mesh of meshes) { scene.remove(mesh); mesh.geometry.dispose(); }
//     for (const geometry of geometries) geometry.dispose();
//   }
//   return { felt, cushion };
// }


import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CUSHION_PROFILE, RAIL_TOP } from './table-model.js';
import { HALF_X as X, HALF_Z as Z, OUTER_X, OUTER_Z, CLOTH_Y as Y, RADIUS, CUSHIONS, POCKET_DETAILS, pocketPoint, pocketCoordinates, HEAD_STRING_X, FOOT_SPOT_X } from './table-model.js';

// Includes the inset sights and the soft leather lip; used for physical cue clearance.
export const RAIL_SURFACE_Y = Y + RAIL_TOP;

export function texture(width, height, paint) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
function path(points, hole = false) {
  const p = hole ? new THREE.Path() : new THREE.Shape();
  points.forEach(([x, z], i) => i ? p.lineTo(x, -z) : p.moveTo(x, -z));
  p.closePath(); return p;
}
function rounded(x, z, radius) {
  const s = new THREE.Shape();
  s.moveTo(-x + radius, -z); s.lineTo(x - radius, -z); s.quadraticCurveTo(x, -z, x, -z + radius);
  s.lineTo(x, z - radius); s.quadraticCurveTo(x, z, x - radius, z);
  s.lineTo(-x + radius, z); s.quadraticCurveTo(-x, z, -x, z - radius);
  s.lineTo(-x, -z + radius); s.quadraticCurveTo(-x, -z, -x + radius, -z);
  return s;
}
function roundedPocketOutline(p) {
  // Soften the two shelf corners while keeping the opening aligned with the jaws.
  const shape=new THREE.Shape(),points=p.outline;
  points.forEach(([x,z],i)=>{
    const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];
    const da=Math.hypot(a[0]-x,a[1]-z),db=Math.hypot(b[0]-x,b[1]-z);
    const r=Math.min(.12,da*.48,db*.48);
    const entry=[x+(a[0]-x)*r/da,z+(a[1]-z)*r/da];
    const exit=[x+(b[0]-x)*r/db,z+(b[1]-z)*r/db];
    if(i===0)shape.moveTo(...entry);else shape.lineTo(...entry);
    shape.quadraticCurveTo(x,z,...exit);
  });
  shape.closePath();return shape.getPoints(8).map(v=>[v.x,v.y]);
}
function circlePocketOutline(p) {
  // A true circle, radius-matched to the chrome collar ring, so the dark
  // opening and the bright rim around it read as one clean round hole
  // instead of a round ring sitting over a jaw-shaped (partly straight) cut.
  const radius = p.width, segments = 48, points = [];
  for (let i = 0; i < segments; i++) {
    const angle = i / segments * Math.PI * 2;
    points.push(pocketPoint(p, Math.cos(angle) * radius, p.roundCenter + Math.sin(angle) * radius));
  }
  return points;
}
function slab(shape, depth, bevel = 0) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, steps: 1, curveSegments: 32 });
  geometry.rotateX(-Math.PI / 2); return geometry;
}
function facesGeometry(faces) {
  const vertices = [], uv = [];
  for (const points of faces) for (let i = 1; i < points.length - 1; i++) {
    for (const p of [points[0], points[i], points[i + 1]]) {
      vertices.push(...p); uv.push(p[0], p[2]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function cushionGeometry(c) {
  // A small rounded nose is the foremost contact point. The covered rubber slopes
  // back into the rail; it is not a single, broad triangular prism.
  const noseHeight = 2 * RADIUS * 0.635;
  const profile = CUSHION_PROFILE;
  const length = Math.hypot(c.nose[1][0] - c.nose[0][0], c.nose[1][1] - c.nose[0][1]);
  const along = [(c.nose[1][0] - c.nose[0][0]) / length, (c.nose[1][1] - c.nose[0][1]) / length];
  const sections = profile.map(([t, h]) => c.nose.map((nose, i) => {
    // Keep the measured mouth at nose height; draft the rubber facing vertically.
    // 14° back draft: the facing opens below the nose and directs impacts down.
    const cutback = (noseHeight - h) * Math.tan(14 * Math.PI / 180) * (i === 0 ? 1 : -1);
    return [
      THREE.MathUtils.lerp(nose[0], c.back[i][0], t) + along[0] * cutback, Y + h,
      THREE.MathUtils.lerp(nose[1], c.back[i][1], t) + along[1] * cutback,
    ];
  }));
  const position = [], uv = [], indices = [];
  for (const section of sections) for (const p of section) {
    position.push(...p); uv.push(p[0], p[2]);
  }
  for (let i = 0; i < sections.length; i++) {
    const a = i * 2, b = ((i + 1) % sections.length) * 2;
    indices.push(a, a + 1, b + 1, a, b + 1, b);
  }
  const body = new THREE.BufferGeometry();
  body.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  body.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  body.setIndex(indices); body.computeVertexNormals();
  // Separate caps preserve the cut facing's crease instead of averaging its normal
  // into the long playing face. Triangulate the concave profile, including its toe.
  const contour = profile.map(([t, h]) => new THREE.Vector2(t, h));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []), ends = [];
  for (let end = 0; end < 2; end++) for (const triangle of triangles) {
    ends.push(triangle.map(i => sections[i][end]));
  }
  return { body, facings: facesGeometry(ends) };
}

function pocketCollar(p, from, to, radius) {
  // Rolled leather around the exposed back of the pocket, with a dark vertical
  // throat below. The front stays open and keeps the original slate shelf.
  const vertices = [], indices = [], steps = 96;
  const crossSection = [
    [radius - 0.012, 0.155], [radius - 0.012, 0.177],
    [radius - 0.006, 0.188], [radius + 0.006, 0.196],
    [radius + 0.020, 0.198], [radius + 0.033, 0.192],
    [radius + 0.041, 0.180], [radius + 0.042, 0.160],
  ];
  for (let i = 0; i <= steps; i++) {
    const angle = THREE.MathUtils.lerp(from, to, i / steps);
    for (const [r, height] of crossSection) {
      const [x, z] = pocketPoint(p, Math.cos(angle) * r, p.roundCenter + Math.sin(angle) * r);
      vertices.push(x, Y + height, z);
    }
  }
  const count = crossSection.length;
  for (let i = 0; i < steps; i++) for (let j = 0; j < count - 1; j++) {
    const a = i * count + j, b = a + count;
    indices.push(a, b, b + 1, a, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function buildTournamentTable(scene, renderer) {
  const staticMeshes = [];
  const add = (geometry, material, y = 0) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.y = y;
    mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); staticMeshes.push(mesh); return mesh;
  };
  const box = (w, h, d, mat, x, y, z, r = 0.025) => {
    const mesh = add(new RoundedBoxGeometry(w, h, d, 4, r), mat, y); mesh.position.set(x, y, z); return mesh;
  };
  // Warm lacquered-wood grain for the rail, instead of a flat dark gray box.
  // Real tables read as premium mainly from this brown-wood / brass contrast
  // against the felt — matching color shades of gray never gets there.
  const woodTexture = texture(512, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#2e1c10'); grad.addColorStop(0.22, '#4a2f18');
    grad.addColorStop(0.5, '#5f3d20'); grad.addColorStop(0.78, '#442a16');
    grad.addColorStop(1, '#2a190d');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * h;
      ctx.strokeStyle = `rgba(20,11,5,${0.06 + Math.random() * 0.13})`;
      ctx.lineWidth = 0.6 + Math.random() * 1.6;
      ctx.beginPath(); ctx.moveTo(0, y);
      let cx = 0, cy = y;
      while (cx < w) { cx += 18 + Math.random() * 46; cy += (Math.random() - 0.5) * 9; ctx.lineTo(cx, cy); }
      ctx.stroke();
    }
  });
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const black = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.28, metalness: 0.06, envMapIntensity: 0.45, side: THREE.DoubleSide });
  const cabinet = new THREE.MeshStandardMaterial({ color: '#101519', roughness: 0.35, metalness: 0.22 });
  // Warm brass instead of cool steel gray — matches the corner/rail hardware
  // on real tables and gives the table its "expensive" accent color.
  const silver = new THREE.MeshStandardMaterial({ color: '#7c6335', roughness: 0.5, metalness: 0.62, envMapIntensity: 0.35, side: THREE.DoubleSide });
  const leather = new THREE.MeshStandardMaterial({ color: '#080a0b', roughness: 0.76, side: THREE.DoubleSide });
  const leatherRim = new THREE.MeshStandardMaterial({ color: '#171412', roughness: 0.88, metalness: 0.02, envMapIntensity: 0.1, side: THREE.DoubleSide });
  const pocketBase = new THREE.MeshBasicMaterial({ color: '#010203', side: THREE.DoubleSide });

  // A hollow cabinet: falling balls remain inside a real cavity instead of a painted black disk.
  const shell = rounded(OUTER_X - 0.05, OUTER_Z - 0.05, 0.40);
  // Clear the whole pocket well, including the back of the side pockets. A narrow
  // cabinet opening otherwise shows a solid horizontal ledge through the hole.
  shell.holes.push(rounded(X + 0.53, Z + 0.53, 0.24));
  add(slab(shell, 0.64, 0.025), cabinet, -0.72);
  const trim = rounded(OUTER_X, OUTER_Z, 0.43);
  trim.holes.push(rounded(OUTER_X - 0.045, OUTER_Z - 0.045, 0.395));
  add(slab(trim, 0.035), silver, -0.075);
  for (const x of [-3.55, 3.55]) for (const z of [-1.55, 1.55]) {
    box(0.44, 0.86, 0.48, cabinet, x, -1.06, z, 0.07);
    box(0.48, 0.07, 0.52, silver, x, -1.48, z, 0.025);
  }

  const feltTexture = texture(512, 512, (ctx, w, h) => {
    const data = ctx.createImageData(w, h);
    // Low-contrast, aperiodic fibers; mipmaps average the grain at playing distance.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const hash = Math.imul(x + y * w + 1, 1597334677) ^ Math.imul(x + 13, 3812015801);
      const i = (y * w + x) * 4, shade = 239 + ((hash >>> 16) % 11) + 2 * Math.sin(x * .037) * Math.sin(y * .029);
      data.data[i] = data.data[i + 1] = data.data[i + 2] = shade; data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
  });
  feltTexture.wrapS = feltTexture.wrapT = THREE.RepeatWrapping; feltTexture.repeat.set(.75, .75);
  feltTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // Cloth is diffuse. Vertex lighting avoids costly glossy/bump shading across
  // most of the viewport, while the rounded cushion normals retain their volume.
  const felt = new THREE.MeshLambertMaterial({ color: '#164d64', map: feltTexture });
  // Stable broad illumination and a narrow cushion contact falloff, evaluated
  // from table coordinates. No moving shadow or per-frame image accumulation.
  felt.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vTablePoint;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTablePoint = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = 'varying vec3 vTablePoint;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 tablePoint = vTablePoint.xz;
      float railDistance = min(${X.toFixed(2)} - abs(tablePoint.x), ${Z.toFixed(2)} - abs(tablePoint.y));
      float cushionShade = mix(0.95, 1.0, smoothstep(0.0, 0.07, railDistance));
      diffuseColor.rgb *= cushionShade;`);
  };
  const cushion = new THREE.MeshLambertMaterial({ color: '#343a3d', emissive: '#343a3d', emissiveIntensity: 0.22, map: feltTexture, side: THREE.DoubleSide });
  const bed = rounded(X + 0.53, Z + 0.53, 0.10);
  const pocketOutlines=POCKET_DETAILS.map(circlePocketOutline);
  for (const outline of pocketOutlines) bed.holes.push(path(outline, true));
  const slate = add(slab(bed, 0.15), new THREE.MeshStandardMaterial({ color: '#1c2529', roughness: 0.9 }), Y - 0.155);
  slate.castShadow = false;
  const cloth = add(new THREE.ShapeGeometry(bed, 32), felt, Y);
  cloth.rotation.x = -Math.PI / 2; cloth.castShadow = false; cloth.receiveShadow = false;
  const markingMaterial = new THREE.MeshBasicMaterial({ color: '#e0e5dc', transparent: true, opacity: 0.17, depthWrite: false });
  const markings = new THREE.Group(); markings.name = 'table-markings';
  for (const [x, z, width, length] of [[HEAD_STRING_X, 0, 0.009, Z * 2], [FOOT_SPOT_X + 0.07, 0, 0.52, 0.009], [FOOT_SPOT_X, 0, 0.009, 0.34], [(HEAD_STRING_X-X)/2, -Z/2, X+HEAD_STRING_X, 0.009], [(HEAD_STRING_X-X)/2, Z/2, X+HEAD_STRING_X, 0.009]]) {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(width, length), markingMaterial);
    mark.rotation.x = -Math.PI / 2; mark.position.set(x, Y + 0.002, z); markings.add(mark);
  }
  scene.add(markings);

  // The nose and jaw positions are shared with physics; only the rubber's vertical
  // profile changes. Soft normals round the nose while the pocket cuts stay crisp.
  for (const c of CUSHIONS) {
    const geometry = cushionGeometry(c);
    const body=add(geometry.body, cushion);body.name = 'cushion-profile';body.receiveShadow=false;
    const facings=add(geometry.facings, cushion);facings.name = 'cushion-pocket-facings';facings.receiveShadow=false;
  }

  // Six lacquered rail sections and inset sights.
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    const start = 0.43, end = X - 0.50;
    box(end - start, 0.14, 0.42, black, sx * (start + end) / 2, Y + 0.115, sz * (Z + 0.55), 0.018);
  }
  for (const sx of [-1, 1]) box(0.42, 0.14, 2 * (Z - 0.5), black, sx * (X + 0.55), Y + 0.115, 0, 0.018);

  // Cast corner caps. The inside edge follows the back of the pocket, leaving a U-shaped mouth.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const outline = [[-0.50, 0.76], [0.34, 0.76]];
    for (let i = 1; i <= 24; i++) {
      const a = Math.PI / 2 - i / 24 * Math.PI / 2;
      outline.push([0.34 + Math.cos(a) * 0.42, 0.34 + Math.sin(a) * 0.42]);
    }
    outline.push([0.76, -0.50], [0.34, -0.50], [0.34, 0.065]);
    // The cap ends at the BACK of each facing, never intruding over the sloped cloth.
    const canonical = POCKET_DETAILS.find(p => p.x === X && p.z === Z);
    for (let i = 0; i <= 24; i++) {
      const angle = 0.85 + i / 24 * (Math.PI - 1.70);
      const radius = canonical.width + 0.021;
      const [x, z] = pocketPoint(canonical, radius * Math.cos(angle), canonical.roundCenter + radius * Math.sin(angle));
      outline.push([x - X, z - Z]);
    }
    outline.push([0.065, 0.34], [-0.50, 0.34]);
    const cap = add(slab(path(outline.map(([x, z]) => [sx * (X + x), sz * (Z + z)])), 0.125, 0.009), silver, Y + 0.045);
    cap.name = 'corner-pocket-cap';
  }
  for (const p of POCKET_DETAILS.filter(p => p.side)) {
    const coords = [[-0.43, 0.76], [0.43, 0.76], [0.43, 0.34]];
    const radius = p.width + 0.021;
    const start = Math.asin((0.34 - p.roundCenter) / radius);
    for (let i = 0; i <= 24; i++) {
      const angle = start + i / 24 * (Math.PI - 2 * start);
      coords.push([radius * Math.cos(angle), p.roundCenter + radius * Math.sin(angle)]);
    }
    coords.push([-0.43, 0.34]);
    add(slab(path(coords.map(([l, d]) => pocketPoint(p, l, d))), 0.125, 0.009), silver, Y + 0.045).name = 'side-pocket-cap';
  }
  for (const [pocketIndex,p] of POCKET_DETAILS.entries()) {
    const faces = [];
    const center = pocketPoint(p, 0, p.roundCenter - 0.03);
    // Slate extrusion and leather must not share a plane: the lining sits just
    // inside the cut so their surfaces cannot flicker against one another.
    const lining = pocketOutlines[pocketIndex].map(([x, z]) => {
      const distance = Math.hypot(center[0] - x, center[1] - z);
      return [x + (center[0] - x) / distance * 0.004, z + (center[1] - z) / distance * 0.004];
    });
    lining.forEach((a, i) => {
      const b = lining[(i + 1) % lining.length];
      // Keep the liner below the sloped facings; only its curved back reaches rail height.
      const topAt = point => Y - 0.004 + Math.max(0, Math.min(1, (pocketCoordinates(p, ...point).depth - p.roundCenter) / p.width)) * 0.165;
      faces.push([[a[0], topAt(a), a[1]], [b[0], topAt(b), b[1]], [b[0], -0.64, b[1]], [a[0], -0.64, a[1]]]);
    });
    const liner = add(facesGeometry(faces), leather); liner.name = 'pocket-liner';
    const radius = p.width + 0.021;
    const start = -.20;
    const collar = add(pocketCollar(p, start, Math.PI - start, radius), leatherRim);
    collar.name = 'pocket-rounded-collar';
    const base = add(new THREE.ShapeGeometry(path(pocketOutlines[pocketIndex])), pocketBase, -0.63);
    base.rotation.x = -Math.PI / 2;
  }
  const sightMaterial = new THREE.MeshBasicMaterial({ color: '#f0eee1' });
  const sight = (x, z) => {
    const m = add(new THREE.CircleGeometry(0.026, 48), sightMaterial, Y + 0.190);
    m.rotation.x=-Math.PI/2;m.position.x=x;m.position.z=z;m.castShadow=m.receiveShadow=false;
  };
  for (const z of [-Z - 0.55, Z + 0.55]) for (const x of [-3.3, -2.2, -1.1, 1.1, 2.2, 3.3]) sight(x, z);
  for (const x of [-X - 0.55, X + 0.55]) for (const z of [-1.1, 0, 1.1]) sight(x, z);
  // Batch the static table by material/shadow state. Keep balls and cue separate.
  const batches = new Map();
  for (const mesh of staticMeshes) {
    const key = `${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(mesh);
  }
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => {
      mesh.updateMatrix();
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      return geometry.applyMatrix4(mesh.matrix);
    });
    const merged = new THREE.Mesh(mergeGeometries(geometries, false), meshes[0].material);
    merged.name = 'table-static-batch'; merged.castShadow = meshes[0].castShadow; merged.receiveShadow = meshes[0].receiveShadow;
    scene.add(merged);
    for (const mesh of meshes) { scene.remove(mesh); mesh.geometry.dispose(); }
    for (const geometry of geometries) geometry.dispose();
  }
  return { felt, cushion };
}