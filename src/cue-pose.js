import { HALF_X, HALF_Z, OUTER_X, OUTER_Z, RADIUS, CLOTH_Y, CUSHION_PROFILE } from './table-model.js';
import { normalizeTip, MAX_TIP_OFFSET } from './cue-spin.js';

export const CUE_LENGTH = 2.8;
export const CUE_DRAW = 0.95;
export const CUE_IDLE_GAP = 0.035;
export const CUE_RADIUS = 0.047;
const SUPPORT_PROFILE = CUSHION_PROFILE.slice(4);

// Conservative envelope: the pocket openings may let a real shaft sit lower,
// but an elevated bridge should never let the wooden shaft pass through a rail.
export function supportHeight(x, z, railTop) {
  const padding = 0.025;
  if (Math.abs(x) > OUTER_X + padding || Math.abs(z) > OUTER_Z + padding) return -Infinity;
  const outside = Math.max(Math.abs(x) - HALF_X, Math.abs(z) - HALF_Z);
  if (outside < -padding) return -Infinity;
  if (Math.abs(x) > HALF_X + 0.03 && Math.abs(z) > HALF_Z + 0.03) return railTop;
  const t = Math.min(1, Math.max(0, outside / 0.34));
  for (let i = 1; i < SUPPORT_PROFILE.length; i++) {
    if (t <= SUPPORT_PROFILE[i][0]) {
      const [a, lowLocal] = SUPPORT_PROFILE[i - 1], [b, highLocal] = SUPPORT_PROFILE[i];
      const low=CLOTH_Y+lowLocal,high=b===1?railTop:CLOTH_Y+highLocal;
      return low + (high - low) * (t - a) / (b - a);
    }
  }
  return railTop;
}

export function cueElevation(ball, angle, railTop, tip={}) {
  const point=normalizeTip(tip),side=point.x*MAX_TIP_OFFSET*RADIUS,vertical=point.y*MAX_TIP_OFFSET*RADIUS;
  const dx = -Math.cos(angle), dz = -Math.sin(angle);
  const clears = elevation => {
    const cos = Math.cos(elevation), sin = Math.sin(elevation);
    // Cover the entire drawn stroke. A fixed bridge angle avoids lifting/jumping while pulling.
    for (let s = RADIUS; s <= CUE_LENGTH + CUE_DRAW + CUE_IDLE_GAP; s += 0.018) {
      const height = supportHeight(ball.x-Math.sin(angle)*side + dx * s * cos, ball.z+Math.cos(angle)*side + dz * s * cos, railTop);
      if (height === -Infinity) continue;
      // At a given distance the resting cue is thicker than the drawn cue.
      // Use that taper, rather than the butt radius at the narrow tip.
      const shaftRadius = 0.021 + 0.026 * Math.min(1, Math.max(0, s / CUE_LENGTH));
      if (CLOTH_Y + RADIUS + vertical + s * sin - shaftRadius < height + 0.010) return false;
    }
    return true;
  };
  let elevation = Math.PI / 90;
  // Find a safe bracket first; very steep near-cushion bridges aren't globally monotonic.
  while (elevation < Math.PI * 0.48 && !clears(elevation)) elevation += Math.PI / 360;
  return elevation;
}

export function cuePose(ball, angle, power, elevation, tip={}) {
  const point=normalizeTip(tip),side=point.x*MAX_TIP_OFFSET*RADIUS,vertical=point.y*MAX_TIP_OFFSET*RADIUS;
  const advance=RADIUS-Math.sqrt(RADIUS*RADIUS-side*side-vertical*vertical);
  const cos = Math.cos(elevation), sin = Math.sin(elevation);
  const axis = [Math.cos(angle) * cos, -sin, Math.sin(angle) * cos];
  const gap = CUE_IDLE_GAP + power * CUE_DRAW;
  return {
    axis,
    position: [ball.x-Math.sin(angle)*side+Math.cos(angle)*advance - axis[0] * gap, CLOTH_Y + RADIUS + vertical - axis[1] * gap, ball.z+Math.cos(angle)*side+Math.sin(angle)*advance - axis[2] * gap],
  };
}
