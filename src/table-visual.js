import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CUSHION_PROFILE, RAIL_TOP } from './table-model.js';
import { HALF_X as X, HALF_Z as Z, OUTER_X, OUTER_Z, CLOTH_Y as Y, RADIUS, CUSHIONS, POCKET_DETAILS, pocketPoint, pocketCoordinates, HEAD_STRING_X, FOOT_SPOT_X } from './table-model.js';

// Preserve the shared rail clearance height; visual trim stays below it.
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
// Derive visual joins from the existing jaw endpoints, never alter the model.
function visualPocket(p) {
  const jaws = CUSHIONS.flatMap(c => c.back.map((back,i) => ({
    back:pocketCoordinates(p,...back), nose:pocketCoordinates(p,...c.nose[i]),
  }))).filter(j=>Math.abs(j.back.lateral)<.4 && j.back.depth>0 && j.back.depth<.4);
  const right=jaws.find(j=>j.back.lateral>0);
  return { jaw:right, mouthWidth:p.side?.230:.225, rearDepth:p.side?.51:.45,
    castingWidth:p.side?.070:.090, linerInset:.004, wellWidth:.28, wellFloor:-.63 };
}
function createCornerPocketMouth(p) {
  const {jaw,rearDepth}=visualPocket(p), {lateral:w,depth:d}=jaw.back;
  const direction=new THREE.Vector2(w-jaw.nose.lateral,d-jaw.nose.depth).normalize();
  const reach=(rearDepth-d)*.65;
  const curve=new THREE.Path();
  curve.moveTo(w,d);
  curve.bezierCurveTo(w+direction.x*reach,d+direction.y*reach,w*.65,rearDepth,0,rearDepth);
  curve.bezierCurveTo(-w*.65,rearDepth,-w-direction.x*reach,d+direction.y*reach,-w,d);
  return curve.getPoints(40).map(v=>[v.x,v.y]);
}
function createSidePocketMouth(p) {
  const {jaw,rearDepth}=visualPocket(p), {lateral:w,depth:d}=jaw.back;
  const direction=new THREE.Vector2(w-jaw.nose.lateral,d-jaw.nose.depth).normalize();
  const reach=(rearDepth-d)*.40;
  const curve=new THREE.Path();
  curve.moveTo(w,d);
  curve.bezierCurveTo(w+direction.x*reach,d+direction.y*reach,w*.80,rearDepth,0,rearDepth);
  curve.bezierCurveTo(-w*.80,rearDepth,-w-direction.x*reach,d+direction.y*reach,-w,d);
  return curve.getPoints(40).map(v=>[v.x,v.y]);
}
function pocketRearEdge(p) {
  return p.side?createSidePocketMouth(p):createCornerPocketMouth(p);
}
function offsetMouth(points,distance) {
  return points.map(([l,d],i)=>{
    const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    return [l+(b[1]-a[1])/length*distance,d-(b[0]-a[0])/length*distance];
  });
}
// Sweep a machined cross-section around the mouth, instead of extruding a flat plate.
function createPocketCasting(p) {
  const edge=pocketRearEdge(p),width=visualPocket(p).castingWidth;
  const profile=[[0,.085],[.08,.115],[.24,.152],[.55,.176],[.87,.181],[1,.163],[1,.108]];
  const positions=[],uv=[],indices=[];
  for(let j=0;j<profile.length;j++){
    const [fraction,height]=profile[j];
    for(const [l,d] of offsetMouth(edge,fraction*width)){
      const [x,z]=pocketPoint(p,l,d);positions.push(x,Y+height,z);uv.push(x,z);
    }
  }
  const count=edge.length;
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<count-1;i++){
    const a=j*count+i,b=a+count;indices.push(a,a+1,b,b,a+1,b+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function createPocketLip(p) {
  const edge=pocketRearEdge(p),inner=offsetMouth(edge,-.014),faces=[];
  for(let i=0;i<edge.length-1;i++){
    const a=pocketPoint(p,...edge[i]),b=pocketPoint(p,...edge[i+1]);
    const c=pocketPoint(p,...inner[i]),d=pocketPoint(p,...inner[i+1]);
    faces.push([[a[0],Y+.084,a[1]],[b[0],Y+.084,b[1]],
      [d[0],Y+.035,d[1]],[c[0],Y+.035,c[1]]]);
  }
  return facesGeometry(faces);
}
function roundedPocketOutline(p) {
  const v=visualPocket(p),{back,nose}=v.jaw, rear=pocketRearEdge(p);
  const t=(p.front-nose.depth)/(back.depth-nose.depth);
  const w=THREE.MathUtils.lerp(nose.lateral,back.lateral,t);
  // Shelf stays at its physical depth; sides follow the jaws into the tangent cup.
  const shape=new THREE.Shape();
  shape.moveTo(-w,p.front);
  shape.quadraticCurveTo(0,p.front+.025,w,p.front);
  shape.lineTo(...rear[0]);
  for(const point of rear.slice(1))shape.lineTo(...point);
  shape.closePath();
  return shape.getPoints(12).map(v=>pocketPoint(p,v.x,v.y));
}
function slab(shape, depth, bevel = 0) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, steps: 1, curveSegments: 32 });
  geometry.rotateX(-Math.PI / 2); return geometry;
}
// Rounded casting edges supply restrained highlights without extra pocket rings.
function metalCap(shape) {
  return slab(shape, .10, .020);
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
  // Subdivide the visual cross-section so the end facings can turn smoothly.
  const profile = CUSHION_PROFILE.flatMap((point,i)=>{
    const next=CUSHION_PROFILE[(i+1)%CUSHION_PROFILE.length];
    const steps=point[0]>=.16 && next[0]>=.16 ? 4 : 1;
    return Array.from({length:steps},(_,j)=>[
      THREE.MathUtils.lerp(point[0],next[0],j/steps),
      THREE.MathUtils.lerp(point[1],next[1],j/steps),
    ]);
  });
  const length = Math.hypot(c.nose[1][0] - c.nose[0][0], c.nose[1][1] - c.nose[0][1]);
  const along = [(c.nose[1][0] - c.nose[0][0]) / length, (c.nose[1][1] - c.nose[0][1]) / length];
  const sections = profile.map(([t, h]) => c.nose.map((nose, i) => {
    // Keep the measured mouth at nose height; draft the rubber facing vertically.
    // 14° back draft: the facing opens below the nose and directs impacts down.
    const cutback = (noseHeight - h) * Math.tan(14 * Math.PI / 180) * (i === 0 ? 1 : -1);
    // Bow only the covered end facing; both measured endpoints remain fixed.
    const rounding=.024*Math.sin(Math.PI*t)**2*(i===0?1:-1);
    return [
      THREE.MathUtils.lerp(nose[0], c.back[i][0], t) + along[0] * (cutback+rounding), Y + h,
      THREE.MathUtils.lerp(nose[1], c.back[i][1], t) + along[1] * (cutback+rounding),
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

export function buildTournamentTable(scene, renderer) {
  const staticMeshes = [];
  const add = (geometry, material, y = 0) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.y = y;
    mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); staticMeshes.push(mesh); return mesh;
  };
  const box = (w, h, d, mat, x, y, z, r = 0.025) => {
    const mesh = add(new RoundedBoxGeometry(w, h, d, 4, r), mat, y); mesh.position.set(x, y, z); return mesh;
  };
  // Deterministic walnut grain, stretched along each rail's length.
  const woodTexture = texture(1024, 128, (ctx, w, h) => {
    const data = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const wave = y + 7 * Math.sin(x * .006 + y * .045) + 3 * Math.sin(x * .019 + y * .11);
      const grain = Math.sin(wave * 2.5) * 4 + Math.sin(wave * .47 + Math.sin(wave * .17)) * 6;
      const noise = ((Math.imul(x + y * w + 1, 1597334677) >>> 16) % 7) - 3;
      const i = (y * w + x) * 4;
      data.data[i] = 30 + grain * .7 + noise;
      data.data[i + 1] = 16 + grain * .45 + noise;
      data.data[i + 2] = 9 + grain * .25 + noise;
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
  });
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const black = new THREE.MeshStandardMaterial({ color: '#ffffff', map: woodTexture, roughness: .55, metalness: 0, envMapIntensity: .035 });
  const cabinet = new THREE.MeshStandardMaterial({ color: '#101519', roughness: 0.35, metalness: 0.22 });
  const silver = new THREE.MeshStandardMaterial({ color: '#89939f', roughness: .27, metalness: .95, envMapIntensity: .85, side: THREE.DoubleSide });
  const leather = new THREE.MeshStandardMaterial({ color: '#080a0b', roughness: 0.76, side: THREE.DoubleSide });
  const pocketBase = new THREE.MeshBasicMaterial({ color: '#010203', side: THREE.DoubleSide });

  // A hollow cabinet: falling balls remain inside a real cavity instead of a painted black disk.
  const shell = rounded(OUTER_X - 0.05, OUTER_Z - 0.05, 0.40);
  // Clear the whole pocket well, including the back of the side pockets. A narrow
  // cabinet opening otherwise shows a solid horizontal ledge through the hole.
  shell.holes.push(rounded(X + 0.62, Z + 0.62, 0.24));
  add(slab(shell, 0.64, 0.025), cabinet, -0.72);
  const trim = rounded(OUTER_X, OUTER_Z, 0.43);
  trim.holes.push(rounded(OUTER_X - 0.045, OUTER_Z - 0.045, 0.395));
  add(slab(trim, 0.035), silver, -0.075);
  const edge = rounded(OUTER_X - .012, OUTER_Z - .012, .418);
  edge.holes.push(rounded(OUTER_X - .024, OUTER_Z - .024, .406));
  add(slab(edge, .012), silver, Y + .165).name = 'rail-edge-inlay';
  for (const x of [-3.55, 3.55]) for (const z of [-1.55, 1.55]) {
    box(0.44, 0.86, 0.48, cabinet, x, -1.06, z, 0.07);
    box(0.48, 0.07, 0.52, silver, x, -1.48, z, 0.025);
  }

  const feltTexture = texture(512, 512, (ctx, w, h) => {
    const data = ctx.createImageData(w, h);
    // Low-contrast, aperiodic fibers; mipmaps average the grain at playing distance.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const hash = Math.imul(x + y * w + 1, 1597334677) ^ Math.imul(x + 13, 3812015801);
      const i = (y * w + x) * 4, shade = 230 + ((hash >>> 16) % 19) + 0.7 * Math.sin(x * .037) * Math.sin(y * .029);
      data.data[i] = data.data[i + 1] = data.data[i + 2] = shade; data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
  });
  feltTexture.wrapS = feltTexture.wrapT = THREE.RepeatWrapping; feltTexture.repeat.set(.75, .75);
  feltTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // Cloth is diffuse. Vertex lighting avoids costly glossy/bump shading across
  // most of the viewport, while the rounded cushion normals retain their volume.
  const felt = new THREE.MeshLambertMaterial({ color: '#1256a0', map: feltTexture });
  // Stable broad illumination and a narrow cushion contact falloff, evaluated
  // from table coordinates. No moving shadow or per-frame image accumulation.
  felt.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vTablePoint;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTablePoint = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = 'varying vec3 vTablePoint;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 tablePoint = vTablePoint.xz;
      float railDistance = min(${X.toFixed(2)} - abs(tablePoint.x), ${Z.toFixed(2)} - abs(tablePoint.y));
      float cushionShade = mix(0.82, 1.0, smoothstep(0.0, 0.22, railDistance));
      diffuseColor.rgb *= cushionShade;`);
  };
  const cushion = new THREE.MeshLambertMaterial({ color: '#1256a0', emissive: '#000000', emissiveIntensity: 0, map: feltTexture, side: THREE.DoubleSide });
  const bed = rounded(X + 0.62, Z + 0.62, 0.10);
  const pocketOutlines=POCKET_DETAILS.map(roundedPocketOutline);
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
  for (const sx of [-1, 1]) {
    const rail = box(2 * (Z - 0.5), 0.14, 0.42, black, sx * (X + 0.55), Y + 0.115, 0, 0.018);
    rail.rotation.y = Math.PI / 2;
  }

  // Walnut corner backing continues the rails. Only the close-fitting U-shaped
  // insert is metal; the broad quarter-corner is no longer a silver plate.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const outline = [[-0.50, 0.76], [0.34, 0.76]];
    for (let i = 1; i <= 24; i++) {
      const a = Math.PI / 2 - i / 24 * Math.PI / 2;
      outline.push([0.34 + Math.cos(a) * 0.42, 0.34 + Math.sin(a) * 0.42]);
    }
    outline.push([0.76, -0.50], [0.34, -0.50]);
    // The cap ends at the BACK of each facing, never intruding over the sloped cloth.
    const canonical = POCKET_DETAILS.find(p => p.x === X && p.z === Z);
    for (const [l,d] of offsetMouth(pocketRearEdge(canonical),visualPocket(canonical).castingWidth)) {
      const [x,z] = pocketPoint(canonical,l,d);
      outline.push([x-X,z-Z]);
    }
    outline.push([-0.50, 0.34]);
    const cap = add(metalCap(path(outline.map(([x, z]) => [sx * (X + x), sz * (Z + z)]))), black, Y + 0.05);
    cap.name = 'corner-rail-backing';
    const pocket = POCKET_DETAILS.find(p=>p.x===sx*X && p.z===sz*Z);
    add(createPocketCasting(pocket),silver).name='corner-pocket-casting';
  }
  for (const p of POCKET_DETAILS.filter(p => p.side)) {
    const coords = [[-0.43, 0.76], [0.43, 0.76], [0.43, 0.34]];
    coords.push(...offsetMouth(pocketRearEdge(p),visualPocket(p).castingWidth));
    coords.push([-0.43, 0.34]);
    add(metalCap(path(coords.map(([l, d]) => pocketPoint(p, l, d)))), silver, Y + 0.05).name = 'side-pocket-cap';
    add(createPocketCasting(p),silver).name='side-pocket-transition';
  }
  for (const [pocketIndex,p] of POCKET_DETAILS.entries()) {
    const v = visualPocket(p), mouth = pocketOutlines[pocketIndex];
    add(createPocketLip(p),leather).name='recessed-mouth-seat';
    const upper = mouth.map(([x,z]) => {
      const q = pocketCoordinates(p,x,z);
      return pocketPoint(p,q.lateral * (1-v.linerInset/v.mouthWidth),
        q.depth + Math.sign((p.front+v.rearDepth)/2-q.depth)*v.linerInset);
    });
    // Thin straight liner immediately under the cut, with a deeper flared well.
    const lower = upper.map(([x,z]) => {
      const q = pocketCoordinates(p,x,z);
      const behindMouth = THREE.MathUtils.clamp((q.depth-p.front)/(v.rearDepth-p.front),0,1);
      return pocketPoint(p,q.lateral * (v.wellWidth/v.mouthWidth),q.depth + .085 * behindMouth);
    });
    const lining = [], well = [];
    upper.forEach((a,i) => {
      const j=(i+1)%upper.length,b=upper[j],c=lower[i],d=lower[j];
      lining.push([[a[0],Y-.004,a[1]],[b[0],Y-.004,b[1]],[b[0],Y-.10,b[1]],[a[0],Y-.10,a[1]]]);
      well.push([[a[0],Y-.10,a[1]],[b[0],Y-.10,b[1]],[d[0],v.wellFloor,d[1]],[c[0],v.wellFloor,c[1]]]);
    });
    add(facesGeometry(lining),leather).name='pocket-mouth-liner';
    add(facesGeometry(well),leather).name='recessed-pocket-well';
    const base=add(new THREE.ShapeGeometry(path(lower)),pocketBase,v.wellFloor);
    base.rotation.x=-Math.PI/2;
  }
  const sightMaterial = new THREE.MeshBasicMaterial({ color: '#f0eee1' });
  const sight = (x, z) => {
    const diamond = new THREE.Shape();
    diamond.moveTo(0, .050); diamond.lineTo(.030, 0); diamond.lineTo(0, -.050); diamond.lineTo(-.030, 0); diamond.closePath();
    const m = add(new THREE.ShapeGeometry(diamond), sightMaterial, Y + 0.190);
    m.rotation.x=-Math.PI/2;if(Math.abs(x)>X)m.rotation.z=Math.PI/2;m.position.x=x;m.position.z=z;m.castShadow=m.receiveShadow=false;
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
  return { felt, cushion, hardware:silver, rails:black };
}
