// One geometric description drives the visible noses/jaws and collision boundaries.
// Scale: 100 x 50 inch playing bed = 8.8 x 4.4 scene units.
export const TABLE_LENGTH_MM = 2540;
export const TABLE_WIDTH_MM = 1270;
// Enlarged for screen readability; rendering, racks and collisions share this size.
export const BALL_DIAMETER_MM = 65;
export const UNITS_PER_MM = 8.8 / TABLE_LENGTH_MM;
export const HALF_X = TABLE_LENGTH_MM * UNITS_PER_MM / 2;
export const HALF_Z = TABLE_WIDTH_MM * UNITS_PER_MM / 2;
export const RADIUS = BALL_DIAMETER_MM * UNITS_PER_MM / 2;
export const CLOTH_Y = 0.035;
export const HEAD_STRING_X = -HALF_X / 2;
export const FOOT_SPOT_X = HALF_X / 2;
// Practice placement: center on the head string, sliding across its width.
export const BREAK_CUE_X = HEAD_STRING_X;
export const INCH = 0.088;
// WPA §9: mouth measured nose-to-nose, with matching horizontal jaw angles.
export const CORNER_MOUTH = 4.5 * INCH;
export const SIDE_MOUTH = 5 * INCH;
export const CORNER_CUT = CORNER_MOUTH / Math.SQRT2;
export const SIDE_CUT = SIDE_MOUTH / 2;
export const CUSHION_BACK = 0.34;
export const RAIL_TOP = 0.202;
export const CUSHION_PROFILE = [
  [1, 0.022], [0.21, 0.022], [0.105, 0.057], [0.027, 0.105],
  [0, 2 * RADIUS * 0.635], [0.009, 0.133], [0.035, 0.138],
  [0.16, 0.149], [0.46, 0.166], [0.84, 0.181], [1, 0.185],
];
const CORNER_BACK = CUSHION_BACK / Math.tan(38 * Math.PI / 180) - CORNER_CUT;
const SIDE_BACK = SIDE_CUT - CUSHION_BACK * Math.tan(14 * Math.PI / 180);
export const OUTER_X = HALF_X + 0.76;
export const OUTER_Z = HALF_Z + 0.76;

export const CUSHIONS = [];
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  CUSHIONS.push({
    nose: [[sx * SIDE_CUT, sz * HALF_Z], [sx * (HALF_X - CORNER_CUT), sz * HALF_Z]],
    back: [[sx * SIDE_BACK, sz * (HALF_Z + CUSHION_BACK)], [sx * (HALF_X + CORNER_BACK), sz * (HALF_Z + CUSHION_BACK)]],
    inward: [0, -sz],
  });
}
for (const sx of [-1, 1]) {
  CUSHIONS.push({
    nose: [[sx * HALF_X, -HALF_Z + CORNER_CUT], [sx * HALF_X, HALF_Z - CORNER_CUT]],
    back: [[sx * (HALF_X + CUSHION_BACK), -HALF_Z - CORNER_BACK], [sx * (HALF_X + CUSHION_BACK), HALF_Z + CORNER_BACK]],
    inward: [-sx, 0],
  });
}
// Shorter corner facings terminate at the compact leather throat. Keep the
// nose-to-nose opening and facing angle unchanged (trim along the same ray).
for (const cushion of CUSHIONS) for (let i=0;i<2;i++) {
  if (Math.abs(cushion.nose[i][0]) < 1) continue;
  cushion.back[i] = cushion.back[i].map((value, axis) => cushion.nose[i][axis] + .8 * (value-cushion.nose[i][axis]));
}
export const CUSHION_SEGMENTS = CUSHIONS.flatMap(c => [
  { a: c.nose[0], b: c.nose[1], inward: c.inward, jaw: false },
  { a: c.nose[0], b: c.back[0], inward: c.inward, jaw: true },
  { a: c.nose[1], b: c.back[1], inward: c.inward, jaw: true },
]);

function makePocket(x, z, nx, nz, side) {
  const pocket = { x, z, nx, nz, tx: nz, tz: -nx, side };
  pocket.width = side ? 0.215 : 0.205;
  pocket.shelf = (side ? 0.25 : 1.5) * INCH;
  pocket.front = side ? pocket.shelf : -CORNER_CUT * Math.SQRT1_2 + pocket.shelf;
  pocket.roundCenter = side ? 0.245 : 0.075;
  pocket.fallDepth = pocket.front + 0.015;
  pocket.outline = [pocketPoint(pocket, -pocket.width, pocket.front), pocketPoint(pocket, pocket.width, pocket.front)];
  for (let i = 0; i <= 32; i++) {
    const angle = i / 32 * Math.PI;
    pocket.outline.push(pocketPoint(pocket, Math.cos(angle) * pocket.width, pocket.roundCenter + Math.sin(angle) * pocket.width));
  }
  return pocket;
}
export function pocketPoint(p, lateral, depth) {
  return [p.x + p.tx * lateral + p.nx * depth, p.z + p.tz * lateral + p.nz * depth];
}
export function pocketCoordinates(p, x, z) {
  return { lateral: (x - p.x) * p.tx + (z - p.z) * p.tz, depth: (x - p.x) * p.nx + (z - p.z) * p.nz };
}
const D = Math.SQRT1_2;
export const POCKET_DETAILS = [
  makePocket(-HALF_X, -HALF_Z, -D, -D, false),
  makePocket(0, -HALF_Z, 0, -1, true),
  makePocket(HALF_X, -HALF_Z, D, -D, false),
  makePocket(-HALF_X, HALF_Z, -D, D, false),
  makePocket(0, HALF_Z, 0, 1, true),
  makePocket(HALF_X, HALF_Z, D, D, false),
];
export const POCKETS = POCKET_DETAILS.map(p => [p.x, p.z]);

export function closestPoint(segment, x, z) {
  const dx = segment.b[0] - segment.a[0], dz = segment.b[1] - segment.a[1];
  const t = Math.max(0, Math.min(1, ((x - segment.a[0]) * dx + (z - segment.a[1]) * dz) / (dx * dx + dz * dz)));
  return [segment.a[0] + t * dx, segment.a[1] + t * dz];
}
