import * as THREE from "three";
import {
  getPocketDesign as readPocketDesign,
  POCKET_TUNING,
} from "./pocket-svg.js";
export { POCKET_TUNING }; // Same config binding, useful to renderer/preview clients.
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CUSHION_PROFILE, CUSHION_BACK, RAIL_TOP } from "./table-model.js";
import {
  HALF_X as X,
  HALF_Z as Z,
  OUTER_X,
  OUTER_Z,
  CLOTH_Y as Y,
  CUSHIONS,
  POCKET_DETAILS,
  pocketPoint,
  pocketCoordinates,
  HEAD_STRING_X,
  FOOT_SPOT_X,
} from "./table-model.js";

// Preserve the shared rail clearance height; visual trim stays below it.
export const RAIL_SURFACE_Y = Y + RAIL_TOP;
// Visual-only width: keep the back seated against the rail, inset the nose.
const visualCushionWidth = () =>
  CUSHION_BACK * POCKET_TUNING.cushion.widthRatio;
// Spread only the middle-pocket facings; keep their slopes and the SVG mouth.

// Register the complete corner assembly from its two jaw entry points. This
// preserves the SVG bends instead of cropping them at an unrelated rail line.
export function getTablePocketDesign(p) {
  const design = readPocketDesign(p);
  if (p.side) return design;
  const inset = CUSHION_BACK - visualCushionWidth();
  const horizontalRight =
    pocketCoordinates(p, p.x - Math.sign(p.x) * 0.2, p.z).lateral > 0;
  const horizontal = pocketPoint(p, ...design.rawJaw(horizontalRight, 0));
  const vertical = pocketPoint(p, ...design.rawJaw(!horizontalRight, 0));
  const dx = p.x + Math.sign(p.x) * inset - vertical[0];
  const dz = p.z + Math.sign(p.z) * inset - horizontal[1];
  const dl = dx * p.tx + dz * p.tz,
    dd = dx * p.nx + dz * p.nz;
  const shift = ([l, d]) => [l + dl, d + dd];
  const [hl, hd] = shift(design.rawJaw(horizontalRight, 0));
  const [vl, vd] = shift(design.rawJaw(!horizontalRight, 0));
  return {
    contour(id) {
      return design.contour(id).map(shift);
    },
    rawContour(id) {
      return design.rawContour(id).map(shift);
    },
    jaw(right, t) {
      const [l, d] = shift(design.rawJaw(horizontalRight, t)),
        [x, y] = design.jawOffset(right);
      if (right === horizontalRight) return [l + x, d + y];
      // Match the approved horizontal chamfer on the other facing, reflected
      // at the corner, while retaining that facing's existing entry point.
      return [vl - (l - hl) + x, vd + (d - hd) + y];
    },
    jawBreaks() {
      return design.jawBreaks(horizontalRight);
    },
  };
}
const getPocketDesign = getTablePocketDesign;

export function texture(width, height, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext("2d"), width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
function path(points, hole = false) {
  const p = hole ? new THREE.Path() : new THREE.Shape();
  points.forEach(([x, z], i) => (i ? p.lineTo(x, -z) : p.moveTo(x, -z)));
  p.closePath();
  return p;
}
function rounded(x, z, radius) {
  const s = new THREE.Shape();
  s.moveTo(-x + radius, -z);
  s.lineTo(x - radius, -z);
  s.quadraticCurveTo(x, -z, x, -z + radius);
  s.lineTo(x, z - radius);
  s.quadraticCurveTo(x, z, x - radius, z);
  s.lineTo(-x + radius, z);
  s.quadraticCurveTo(-x, z, -x, z - radius);
  s.lineTo(-x, -z + radius);
  s.quadraticCurveTo(-x, -z, -x + radius, -z);
  return s;
}
// The editable SVG is the source of truth for all pocket silhouettes.
function roundedPocketOutline(p) {
  return getPocketDesign(p)
    .contour("mouth")
    .map(([l, d]) => pocketPoint(p, l, d));
}

function slab(shape, depth, bevel = 0) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 32,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
function facesGeometry(faces) {
  const vertices = [],
    uv = [];
  for (const points of faces)
    for (let i = 1; i < points.length - 1; i++) {
      for (const p of [points[0], points[i], points[i + 1]]) {
        vertices.push(...p);
        uv.push(p[0], p[2]);
      }
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}

export function cushionGeometry(c) {
  const horizontal = Math.abs(c.nose[0][1] - c.nose[1][1]) < 1e-6;
  const axis = horizontal ? 1 : 0;
  const ends = c.nose.map((nose) => {
    const side = Math.abs(nose[0]) < 1;
    const p = POCKET_DETAILS.find((p) =>
      side
        ? p.side && Math.sign(p.z) === Math.sign(nose[1])
        : !p.side &&
          Math.sign(p.x) === Math.sign(nose[0]) &&
          Math.sign(p.z) === Math.sign(nose[1]),
    );
    const design = getPocketDesign(p),
      right = pocketCoordinates(p, ...nose).lateral > 0;
    const knots = [0, ...design.jawBreaks(right), 1].sort((a, b) => a - b);
    const points = knots.map((t) => {
      const [l, d] = design.jaw(right, t);

      const point = pocketPoint(
        p,
        l + (side ? (right ? 1 : -1) * POCKET_TUNING.side.jawSpread : 0),
        d,
      );

      if (!horizontal) {
        const extend = POCKET_TUNING.cushion.verticalEndExtend ?? 0;
        const weight = 1 - t;

        // Kéo dài đầu băng về phía lỗ góc
        point[1] += Math.sign(nose[1]) * extend * weight;

        // Đẩy cả băng xám dọc vào phía trong bàn
        const sideInsetX = POCKET_TUNING.cushion.sideInsetX ?? 0;
        point[0] += -Math.sign(nose[0]) * sideInsetX;
      }

      return point;
    });
    const to = nose[axis] + Math.sign(nose[axis]) * CUSHION_BACK;
    const from = to - Math.sign(nose[axis]) * visualCushionWidth();
    // Parameterize by distance across the rail, not distance along the jaw.
    // Equal profile heights then meet the same straight rail line at both ends.
    const fractions = points.map((point) => (point[axis] - from) / (to - from));
    return { points, fractions, from, to };
  });
  const profile = CUSHION_PROFILE.flatMap((point, i) => {
    const next = CUSHION_PROFILE[(i + 1) % CUSHION_PROFILE.length];
    const fractions = Array.from({ length: 8 }, (_, j) => j / 8);
    if (next[0] !== point[0])
      for (const end of ends)
        for (const knot of end.fractions) {
          const f = (knot - point[0]) / (next[0] - point[0]);
          if (f > 0 && f < 1) fractions.push(f);
        }
    return [...new Set(fractions)]
      .sort((a, b) => a - b)
      .map((f) => [
        THREE.MathUtils.lerp(point[0], next[0], f),
        THREE.MathUtils.lerp(point[1], next[1], f),
      ]);
  });
  const sections = profile.map(([t, h]) =>
    ends.map((end) => {
      const { points, fractions, from, to } = end;
      let j = fractions.findIndex(
        (f, i) => i < fractions.length - 1 && t >= f && t <= fractions[i + 1],
      );
      // Only the short end segments continue to the rail boundaries. Never
      // deform the imported jaw or add a second, tapered shoulder.
      if (j < 0) j = t < fractions[0] ? 0 : fractions.length - 2;
      const span = fractions[j + 1] - fractions[j];
      const f = Math.abs(span) > 1e-10 ? (t - fractions[j]) / span : 0;
      const point = points[j].map((v, k) =>
        THREE.MathUtils.lerp(v, points[j + 1][k], f),
      );
      point[axis] = THREE.MathUtils.lerp(from, to, t);
      const moveDown =
        horizontal && c.nose[0][1] < 0 ? POCKET_TUNING.cushion.upperOffsetZ : 0;
      return [point[0], Y + h, point[1] + moveDown];
    }),
  );
  const stride = 2;
  const position = [],
    uv = [],
    indices = [];
  for (const section of sections)
    for (const p of section) {
      position.push(...p);
      uv.push(p[0], p[2]);
    }
  for (let i = 0; i < sections.length; i++) {
    for (let j = 0; j < stride - 1; j++) {
      const a = i * stride + j,
        b = ((i + 1) % sections.length) * stride + j;
      indices.push(a, a + 1, b + 1, a, b + 1, b);
    }
  }
  const body = new THREE.BufferGeometry();
  body.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  body.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  body.setIndex(indices);
  body.computeVertexNormals();
  // Build each folded facing as separate strips. Triangulating the whole
  // non-planar cap in profile space bridges the SVG elbow and causes overlaps.
  const ts = [...new Set(profile.map(([t]) => t))].sort((a, b) => a - b);
  const heights = (t) => {
    const values = [];
    for (let i = 0; i < CUSHION_PROFILE.length; i++) {
      const a = CUSHION_PROFILE[i],
        b = CUSHION_PROFILE[(i + 1) % CUSHION_PROFILE.length];
      if (t < Math.min(a[0], b[0]) - 1e-10 || t > Math.max(a[0], b[0]) + 1e-10)
        continue;
      if (Math.abs(b[0] - a[0]) < 1e-10) values.push(a[1], b[1]);
      else
        values.push(
          THREE.MathUtils.lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0])),
        );
    }
    return [Math.min(...values), Math.max(...values)];
  };
  const caps = [];
  for (let end = 0; end < 2; end++)
    for (let i = 0; i < ts.length - 1; i++) {
      const a = sections[profile.findIndex(([t]) => t === ts[i])][end];
      const b = sections[profile.findIndex(([t]) => t === ts[i + 1])][end];
      const [lowA, highA] = heights(ts[i]),
        [lowB, highB] = heights(ts[i + 1]);
      caps.push([
        [a[0], Y + lowA, a[2]],
        [b[0], Y + lowB, b[2]],
        [b[0], Y + highB, b[2]],
        [a[0], Y + highA, a[2]],
      ]);
    }
  return { body, facings: facesGeometry(caps) };
}

export function buildTournamentTable(scene, renderer) {
  const staticMeshes = [];
  const add = (geometry, material, y = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    staticMeshes.push(mesh);
    return mesh;
  };
  const box = (w, h, d, mat, x, y, z, r = 0.025) => {
    const mesh = add(new RoundedBoxGeometry(w, h, d, 4, r), mat, y);
    mesh.position.set(x, y, z);
    return mesh;
  };
  // Fine charcoal grain, stretched along each top rail.
  const woodTexture = texture(1024, 128, (ctx, w, h) => {
    const data = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const wave =
          y +
          7 * Math.sin(x * 0.006 + y * 0.045) +
          3 * Math.sin(x * 0.019 + y * 0.11);
        const grain =
          Math.sin(wave * 2.5) * 2.0 +
          Math.sin(wave * 0.47 + Math.sin(wave * 0.17)) * 2.6;
        const noise = ((Math.imul(x + y * w + 1, 1597334677) >>> 16) % 7) - 3;
        const i = (y * w + x) * 4;
        data.data[i] = 12 + grain + noise * 0.35;
        data.data[i + 1] = 13 + grain + noise * 0.35;
        data.data[i + 2] = 14 + grain + noise * 0.35;
        data.data[i + 3] = 255;
      }
    ctx.putImageData(data, 0, 0);
  });
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const black = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: woodTexture,
    roughness: 0.68,
    metalness: 0.12,
    envMapIntensity: 0.12,
  });
  const cabinet = new THREE.MeshStandardMaterial({
    color: "#101519",
    roughness: 0.35,
    metalness: 0.22,
  });
  const brushedMetal = texture(256, 256, (ctx, w, h) => {
    const data = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const grain = ((Math.imul(y + 1, 1597334677) >>> 16) % 9) - 4;
        const shade =
          210 + 22 * Math.sin(((x + y * 0.35) / w) * Math.PI * 2) + grain;
        const i = (y * w + x) * 4;
        data.data[i] = data.data[i + 1] = data.data[i + 2] = shade;
        data.data[i + 3] = 255;
      }
    ctx.putImageData(data, 0, 0);
  });
  brushedMetal.wrapS = brushedMetal.wrapT = THREE.RepeatWrapping;
  brushedMetal.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const silver = new THREE.MeshStandardMaterial({
    map: brushedMetal,
    color: "#959b9f",
    roughness: 0.43,
    metalness: 0.72,
    envMapIntensity: 0.65,
    side: THREE.DoubleSide,
  });
  // Pocket hardware has its own satin finish; rail inlays and lower hardware
  // retain their existing material. Broad studio reflections reveal the bevels.
  const metalStudio = new THREE.Scene();
  metalStudio.background = new THREE.Color("#24272b");
  const panels = [];
  for (const [x, y, z, w, h, power] of [
    [-3, 5, 1, 2.8, 8, 3.0],
    [3, 4, -2, 1.5, 7, 1.6],
    [0, 3, 5, 8, 1.2, 0.8],
  ]) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(power, power * 0.98, power * 0.95),
        side: THREE.DoubleSide,
      }),
    );
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    metalStudio.add(panel);
    panels.push(panel);
  }
  const metalPmrem = new THREE.PMREMGenerator(renderer);
  const metalEnvironment = metalPmrem.fromScene(metalStudio, 0.12);
  metalPmrem.dispose();
  for (const panel of panels) {
    panel.geometry.dispose();
    panel.material.dispose();
  }
  const pocketMetal = new THREE.MeshStandardMaterial({
    color: "#b6b8b9",
    metalness: 1,
    roughness: 0.37,
    envMap: metalEnvironment.texture,
    envMapIntensity: 0.68,
    side: THREE.DoubleSide,
  });
  pocketMetal.name = "satin-platinum-pocket-trim";
  pocketMetal.userData.environmentTarget = metalEnvironment;
  pocketMetal.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec3 vHardwarePoint;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvHardwarePoint=(modelMatrix*vec4(transformed,1.0)).xyz;",
    );
    shader.fragmentShader =
      "varying vec3 vHardwarePoint;\n" + shader.fragmentShader;
    // Coordinates follow each fitting, with the same machining across all six.
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 hp=abs(vHardwarePoint.xz);
      bool sideCap=hp.x<0.7;
      vec2 local=sideCap?vec2(vHardwarePoint.x,hp.y-${Z.toFixed(6)}):hp-vec2(${X.toFixed(6)},${Z.toFixed(6)});
      float across=sideCap?local.y:(local.x+local.y)*0.707107;
      float along=sideCap?local.x:(local.x-local.y)*0.707107;
      float grain=sin(across*2100.0+sin(along*32.0)*.3);
      float grainAA=1.0-smoothstep(.35,1.5,fwidth(across*2100.0));
      float satin=.84+.12*smoothstep(.32,.64,across);
      diffuseColor.rgb*=satin+grain*.018*grainAA;`,
    );
    // A shallow crown bends the broad reflection across the top, while actual
    // rolled bevels retain their geometric normals and narrow edge highlights.
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      `#include <normal_fragment_begin>
      vec3 worldNormal=inverseTransformDirection(normal,viewMatrix);
      if(worldNormal.y>.95){
        vec2 slope=sideCap?vec2(along*.14,(across-.55)*1.45):
          vec2((local.x-.32)*.95,(local.y-.32)*.95);
        slope*=vec2(sideCap?1.0:sign(vHardwarePoint.x),sign(vHardwarePoint.z));
        normal=normalize(normal+mat3(viewMatrix)*vec3(slope.x,0.0,slope.y));
      }`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\nroughnessFactor+=.035*sin(across*95.0)*grainAA;",
    );
  };
  const leather = new THREE.MeshBasicMaterial({
    color: "#111416",
    side: THREE.DoubleSide,
  });
  const pocketBase = new THREE.MeshBasicMaterial({
    color: "#101315",
    side: THREE.DoubleSide,
  });

  // A hollow cabinet: falling balls remain inside a real cavity instead of a painted black disk.
  const shell = rounded(OUTER_X - 0.05, OUTER_Z - 0.05, 0.4);
  // Clear the whole pocket well, including the back of the side pockets. A narrow
  // cabinet opening otherwise shows a solid horizontal ledge through the hole.
  const cabinetOpening = rounded(X + 0.62, Z + 0.62, 0.24);
  // Clear the imported side mouths locally, including the cabinet bevel.
  for (const p of POCKET_DETAILS.filter((p) => p.side)) {
    const mouth = roundedPocketOutline(p),
      sign = -p.nz;
    const clearance = Math.max(
      Z + 0.62,
      ...mouth.map(([, z]) => Math.abs(z) + 0.04),
    );
    const lo = Math.min(...mouth.map(([x]) => x)) - 0.04,
      hi = Math.max(...mouth.map(([x]) => x)) + 0.04;
    cabinetOpening.curves = cabinetOpening.curves.flatMap((curve) => {
      if (
        !curve.isLineCurve ||
        Math.abs(curve.v1.y - sign * (Z + 0.62)) > 1e-6 ||
        Math.abs(curve.v2.y - curve.v1.y) > 1e-6
      )
        return [curve];
      const [a, b] = curve.v1.x < curve.v2.x ? [lo, hi] : [hi, lo];
      const pts = [
        curve.v1,
        new THREE.Vector2(a, curve.v1.y),
        new THREE.Vector2(a, sign * clearance),
        new THREE.Vector2(b, sign * clearance),
        new THREE.Vector2(b, curve.v2.y),
        curve.v2,
      ];
      return pts.slice(1).map((v, i) => new THREE.LineCurve(pts[i], v));
    });
  }
  shell.holes.push(cabinetOpening);
  add(slab(shell, 0.64, 0.025), cabinet, -0.72);
  const cornerSeams = POCKET_DETAILS.filter((p) => !p.side).map((p) => {
    const outline = getPocketDesign(p)
      .rawContour("trim")
      .map(([l, d]) => pocketPoint(p, l, d));
    return {
      p,
      x: Math.min(...outline.map(([x]) => Math.abs(x))),
      z: Math.min(...outline.map(([, z]) => Math.abs(z))),
    };
  });
  // The SVG casting owns each corner: stop the older perimeter bands there.
  const frameSilver = silver.clone();
  frameSilver.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec2 vFramePoint;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvFramePoint=(modelMatrix*vec4(transformed,1.0)).xz;",
    );
    shader.fragmentShader =
      "varying vec2 vFramePoint;\n" + shader.fragmentShader;
    const cuts = cornerSeams
      .map(
        ({ p, x, z }) =>
          `if(vFramePoint.x*${Math.sign(p.x).toFixed(1)}>${x.toFixed(6)}&&vFramePoint.y*${Math.sign(p.z).toFixed(1)}>${z.toFixed(6)})discard;`,
      )
      .join("\n");
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <clipping_planes_fragment>",
      "#include <clipping_planes_fragment>\n" + cuts,
    );
  };
  const trim = rounded(OUTER_X, OUTER_Z, 0.43);
  trim.holes.push(rounded(OUTER_X - 0.045, OUTER_Z - 0.045, 0.395));
  add(slab(trim, 0.035), frameSilver, -0.075).castShadow = false;
  const edge = rounded(OUTER_X - 0.012, OUTER_Z - 0.012, 0.418);
  edge.holes.push(rounded(OUTER_X - 0.024, OUTER_Z - 0.024, 0.406));
  const frameEdge = add(slab(edge, 0.012), frameSilver, Y + 0.165);
  frameEdge.name = "rail-edge-inlay";
  frameEdge.castShadow = false;
  for (const x of [-3.55, 3.55])
    for (const z of [-1.55, 1.55]) {
      box(0.44, 0.86, 0.48, cabinet, x, -1.06, z, 0.07);
      box(0.48, 0.07, 0.52, silver, x, -1.48, z, 0.025);
    }

  const feltTexture = texture(512, 512, (ctx, w, h) => {
    const data = ctx.createImageData(w, h);
    // Low-contrast, aperiodic fibers; mipmaps average the grain at playing distance.
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const hash =
          Math.imul(x + y * w + 1, 1597334677) ^ Math.imul(x + 13, 3812015801);
        const i = (y * w + x) * 4,
          shade =
            225 +
            ((hash >>> 16) % 21) +
            0.6 * Math.sin(x * 0.037) * Math.sin(y * 0.029);
        data.data[i] = data.data[i + 1] = data.data[i + 2] = shade;
        data.data[i + 3] = 255;
      }
    ctx.putImageData(data, 0, 0);
  });
  feltTexture.wrapS = feltTexture.wrapT = THREE.RepeatWrapping;
  feltTexture.repeat.set(0.75, 0.75);
  feltTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // Cloth is diffuse. Vertex lighting avoids costly glossy/bump shading across
  // most of the viewport, while the rounded cushion normals retain their volume.
  const felt = new THREE.MeshLambertMaterial({
    color: "#5e6569",
    map: feltTexture,
  });
  // Stable broad illumination and a narrow cushion contact falloff, evaluated
  // from table coordinates. No moving shadow or per-frame image accumulation.
  felt.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec3 vTablePoint;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvTablePoint = (modelMatrix * vec4(transformed, 1.0)).xyz;",
    );
    shader.fragmentShader =
      "varying vec3 vTablePoint;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 tablePoint = vTablePoint.xz;
      float railDistance = min(${X.toFixed(2)} - abs(tablePoint.x), ${Z.toFixed(2)} - abs(tablePoint.y));
      float cushionShade = mix(0.77, 1.0, smoothstep(0.0, 0.18, railDistance));
      diffuseColor.rgb *= cushionShade;`,
    );
  };
  const cushion = new THREE.MeshLambertMaterial({
    color: "#5e6569",
    emissive: "#000000",
    emissiveIntensity: 0,
    map: feltTexture,
    side: THREE.DoubleSide,
  });
  const bed = rounded(X + 0.62, Z + 0.62, 0.1);
  const pocketOutlines = POCKET_DETAILS.map(roundedPocketOutline);
  for (const outline of pocketOutlines) bed.holes.push(path(outline, true));
  const slate = add(
    slab(bed, 0.15),
    new THREE.MeshStandardMaterial({ color: "#1c2529", roughness: 0.9 }),
    Y - 0.155,
  );
  slate.castShadow = false;
  const cloth = add(new THREE.ShapeGeometry(bed, 32), felt, Y);
  cloth.rotation.x = -Math.PI / 2;
  cloth.castShadow = false;
  cloth.receiveShadow = false;
  const markingMaterial = new THREE.MeshBasicMaterial({
    color: "#e0e5dc",
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
  });
  const markings = new THREE.Group();
  markings.name = "table-markings";
  for (const [x, z, width, length] of [
    [HEAD_STRING_X, 0, 0.009, Z * 2],
    [FOOT_SPOT_X + 0.07, 0, 0.52, 0.009],
    [FOOT_SPOT_X, 0, 0.009, 0.34],
    [(HEAD_STRING_X - X) / 2, -Z / 2, X + HEAD_STRING_X, 0.009],
    [(HEAD_STRING_X - X) / 2, Z / 2, X + HEAD_STRING_X, 0.009],
  ]) {
    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(width, length),
      markingMaterial,
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(x, Y + 0.002, z);
    markings.add(mark);
  }
  scene.add(markings);

  // The nose and jaw positions are shared with physics; only the rubber's vertical
  // profile changes. Soft normals round the nose while the pocket cuts stay crisp.
  for (const c of CUSHIONS) {
    const geometry = cushionGeometry(c);
    const body = add(geometry.body, cushion);
    body.name = "cushion-profile";
    body.receiveShadow = false;
    const facings = add(geometry.facings, cushion);
    facings.name = "cushion-pocket-facings";
    facings.receiveShadow = false;
  }

  // Six lacquered rail sections and inset sights.
  for (const sz of [-1, 1])
    for (const sx of [-1, 1]) {
      const p = POCKET_DETAILS.find((p) => p.side && Math.sign(p.z) === sz);
      const start = Math.max(
        ...getPocketDesign(p)
          .rawContour("trim")
          .map(([l, d]) => sx * pocketPoint(p, l, d)[0]),
      );
      const end = cornerSeams.find(
        ({ p }) => Math.sign(p.x) === sx && Math.sign(p.z) === sz,
      ).x;
      box(
        end - start,
        0.14,
        0.42,
        black,
        (sx * (start + end)) / 2,
        Y + 0.115,
        sz * (Z + 0.55),
        0.018,
      );
    }
  const SIDE_RAIL_EXTRA_TOP = 0.1;
  const SIDE_RAIL_EXTRA_BOTTOM = 0.03;

  for (const sx of [-1, 1]) {
    const lowerBase = cornerSeams.find(
      ({ p }) => Math.sign(p.x) === sx && p.z < 0,
    ).z;

    const upperBase = cornerSeams.find(
      ({ p }) => Math.sign(p.x) === sx && p.z > 0,
    ).z;

    const lower = lowerBase + SIDE_RAIL_EXTRA_BOTTOM;

    const upper = upperBase + SIDE_RAIL_EXTRA_TOP;

    const railLength = lower + upper;

    const railCenterZ = (upper - lower) / 2;

    const rail = box(
      railLength,
      0.14,
      0.42,
      black,
      sx * (X + 0.55),
      Y + 0.115,
      railCenterZ,
      0.018,
    );

    rail.rotation.y = Math.PI / 2;
  }

  // Render the closed SVG trim path directly. No outward bevel offsets: an
  // offset would change the user's top-view outline. The satin material supplies
  // highlights; the extrusion supplies thickness below the drawn face.
  for (const [index, p] of POCKET_DETAILS.entries()) {
    const design = getPocketDesign(p);
    const trimPoints = design
      .contour("trim")
      .map(([l, d]) => pocketPoint(p, l, d));
    const plate = add(slab(path(trimPoints), 0.055), pocketMetal, Y + 0.085);
    plate.name = `svg-pocket-trim-${index}`;
    plate.userData.pocketSvg = { type: p.side ? "side" : "corner", id: "trim" };
    const mouth = pocketOutlines[index],
      walls = [];
    const center = mouth.reduce(
      (sum, p) => [sum[0] + p[0] / mouth.length, sum[1] + p[1] / mouth.length],
      [0, 0],
    );
    const lining = mouth.map(([x, z]) => {
      const length = Math.hypot(center[0] - x, center[1] - z) || 1;
      return [
        x + ((center[0] - x) * 0.002) / length,
        z + ((center[1] - z) * 0.002) / length,
      ];
    });
    lining.forEach((a, i) => {
      const b = lining[(i + 1) % lining.length];
      // Liner follows the exact same SVG boundary as the hole in the cloth.
      const lipY = Y + 0.14;
      walls.push([
        [a[0], lipY, a[1]],
        [b[0], lipY, b[1]],
        [b[0], -0.63, b[1]],
        [a[0], -0.63, a[1]],
      ]);
    });
    add(facesGeometry(walls), leather).name = `svg-pocket-liner-${index}`;
    const base = add(new THREE.ShapeGeometry(path(mouth)), pocketBase, -0.63);
    base.rotation.x = -Math.PI / 2;
    base.name = `svg-pocket-floor-${index}`;
  }
  const sightMaterial = new THREE.MeshBasicMaterial({ color: "#f0eee1" });
  const sight = (x, z) => {
    const diamond = new THREE.Shape();
    diamond.moveTo(0, 0.05);
    diamond.quadraticCurveTo(0.012, 0.014, 0.04, 0);
    diamond.quadraticCurveTo(0.012, -0.014, 0, -0.05);
    diamond.quadraticCurveTo(-0.012, -0.014, -0.04, 0);
    diamond.quadraticCurveTo(-0.012, 0.014, 0, 0.05);
    diamond.closePath();
    const m = add(new THREE.ShapeGeometry(diamond), sightMaterial, Y + 0.19);
    m.rotation.x = -Math.PI / 2;
    if (Math.abs(x) > X) m.rotation.z = Math.PI / 2;
    m.position.x = x;
    m.position.z = z;
    m.castShadow = m.receiveShadow = false;
  };
  for (const z of [-Z - 0.55, Z + 0.55])
    for (const x of [-3.3, -2.2, -1.1, 1.1, 2.2, 3.3]) sight(x, z);
  for (const x of [-X - 0.55, X + 0.55])
    for (const z of [-1.1, 0, 1.1]) sight(x, z);
  // Batch the static table by material/shadow state. Keep balls and cue separate.
  const batches = new Map();
  for (const mesh of staticMeshes) {
    if (mesh.userData.pocketSvg) continue;
    const key = `${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(mesh);
  }
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((mesh) => {
      mesh.updateMatrix();
      const geometry = mesh.geometry.index
        ? mesh.geometry.toNonIndexed()
        : mesh.geometry.clone();
      return geometry.applyMatrix4(mesh.matrix);
    });
    const merged = new THREE.Mesh(
      mergeGeometries(geometries, false),
      meshes[0].material,
    );
    merged.name = "table-static-batch";
    merged.castShadow = meshes[0].castShadow;
    merged.receiveShadow = meshes[0].receiveShadow;
    scene.add(merged);
    for (const mesh of meshes) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const geometry of geometries) geometry.dispose();
  }
  return { felt, cushion, hardware: silver, rails: black };
}
