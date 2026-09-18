import { HALF_X, HALF_Z, RADIUS, CUSHION_SEGMENTS, POCKET_DETAILS, pocketCoordinates, pocketPoint, closestPoint, BREAK_CUE_X, FOOT_SPOT_X, HEAD_STRING_X } from './table-model.js';
export { HALF_X, HALF_Z, RADIUS, POCKETS } from './table-model.js';
export const BALL_COLORS = ['#fffdf4', '#f4b900', '#124cbd', '#b61b25', '#66268b', '#e65509', '#006844', '#711824', '#080b10', '#f4b900', '#124cbd', '#b61b25', '#66268b', '#e65509', '#006844', '#711824'];
export const STEP = 1 / 360;
export const GRAVITY = 9.81 * (8.8 / 2.54);
export const SLIDING_FRICTION = 0.2;
export const ROLLING_FRICTION = 0.010;
const STOP_SPEED = 0.002;
// Unit ball mass. Finite-duration contacts transmit compression through a rack
// simultaneously, instead of resolving each overlapping pair once in array order.
const CONTACT_STIFFNESS = 1e6;
const CONTACT_DAMPING = 18.4;
const CONTACT_SUBSTEPS = 20;
export function shotSpeed(power) {
  const p = Math.min(1, Math.max(0, power));
  return 0.75 * (0.15 * p + 22.15 * p ** 1.8 + 10 * p ** 4);
}
function initialRotation(id) {
  // Deterministic, varied orientations keep every stripe/number from facing the
  // same way. Rotation thereafter belongs entirely to the physics simulation.
  const x = id ? .35 + Math.sin(id * 1.72) * .9 : .25;
  const y = id * 2.399963, z = id ? -.3 + Math.cos(id * .83) * .7 : .2;
  const c1=Math.cos(x/2),c2=Math.cos(y/2),c3=Math.cos(z/2);
  const s1=Math.sin(x/2),s2=Math.sin(y/2),s3=Math.sin(z/2);
  return { qx:s1*c2*c3+c1*s2*s3, qy:c1*s2*c3-s1*c2*s3,
    qz:c1*c2*s3+s1*s2*c3, qw:c1*c2*c3-s1*s2*s3 };
}

function integrateRotation(b, wx, wz, dt) {
  const speed = Math.hypot(wx, wz);
  if (speed < 1e-10) return;
  const half = speed * dt / 2, scale = Math.sin(half) / speed;
  const x = wx * scale, z = wz * scale, w = Math.cos(half);
  const qx = w * b.qx + x * b.qw - z * b.qy;
  const qy = w * b.qy + z * b.qx - x * b.qz;
  const qz = w * b.qz + z * b.qw + x * b.qy;
  const qw = w * b.qw - x * b.qx - z * b.qz;
  const norm = Math.hypot(qx, qy, qz, qw);
  b.qx = qx / norm; b.qy = qy / norm; b.qz = qz / norm; b.qw = qw / norm;
}

export function createRack(layout = 'rack') {
  const make = (id, x, z) => {
    const q = initialRotation(id), norm = Math.hypot(q.qx,q.qy,q.qz,q.qw);
    const rotation = { qx:q.qx/norm,qy:q.qy/norm,qz:q.qz/norm,qw:q.qw/norm };
    return { id, x, z, px:x, pz:z, y:RADIUS, py:RADIUS, vx:0, vz:0, vy:0, wx:0, wz:0, ...rotation,
      pqx:rotation.qx,pqy:rotation.qy,pqz:rotation.qz,pqw:rotation.qw, pocketed:false,falling:false };
  };
  const balls = [make(0, layout === 'rack' ? BREAK_CUE_X : -2.45, layout === 'rack' ? 0 : 0.1)];
  if (layout === 'practice') {
    [[0.15, -0.65], [2.8, -1.25], [1.95, 1.12], [0.85, 0.7], [3.15, 0.25], [-0.7, -1.35], [-1.1, 1.25], [2.05, -0.3], [3.55, 1.42], [0.3, 1.6], [-3.15, -1.2], [1.6, -1.5], [-0.5, 0.35], [-2.6, 1.4], [3.75, -0.8]].forEach(([x, z], i) => balls.push(make(i + 1, x, z)));
  } else {
    const order = [1, 10, 2, 3, 8, 11, 12, 4, 13, 5, 6, 14, 7, 15, 9];
    let n = 0;
    for (let row = 0; row < 5; row++) for (let col = 0; col <= row; col++) {
      balls.push(make(order[n++], FOOT_SPOT_X + row * RADIUS * Math.sqrt(3) * 1.001, (col - row / 2) * RADIUS * 2 * 1.001));
    }
  }
  return balls;
}

// Slip velocity at the cloth is v + omega x (0, -R, 0).
// I = 2/5 mR²: sliding friction changes both translation and angular velocity.
export function clothMotion(b, dt, rollingFriction = ROLLING_FRICTION) {
  const ux = b.vx + RADIUS * b.wz, uz = b.vz - RADIUS * b.wx;
  const slip = Math.hypot(ux, uz);
  let remaining = dt;
  if (slip > 0.0001) {
    const deceleration = SLIDING_FRICTION * GRAVITY;
    const slidingTime = Math.min(dt, slip / (3.5 * deceleration));
    const ax = -deceleration * ux / slip, az = -deceleration * uz / slip;
    b.x += b.vx * slidingTime + 0.5 * ax * slidingTime ** 2;
    b.z += b.vz * slidingTime + 0.5 * az * slidingTime ** 2;
    b.vx += ax * slidingTime; b.vz += az * slidingTime;
    b.wx -= 2.5 * az / RADIUS * slidingTime;
    b.wz += 2.5 * ax / RADIUS * slidingTime;
    remaining -= slidingTime;
  }
  if (remaining > 1e-10) {
    const speed = Math.hypot(b.vx, b.vz);
    if (speed > STOP_SPEED) {
      const a = rollingFriction * GRAVITY;
      const duration = Math.min(remaining, speed / a);
      const next = Math.max(0, speed - a * duration);
      const distance = (speed + next) * 0.5 * duration;
      b.x += b.vx / speed * distance; b.z += b.vz / speed * distance;
      b.vx *= next / speed; b.vz *= next / speed;
    } else { b.vx = b.vz = 0; }
    b.wx = b.vz / RADIUS; b.wz = -b.vx / RADIUS;
  }
}

export class PoolPhysics {
  constructor(onEvent = () => {}) { this.onEvent = onEvent; this.reset(); }
  reset(layout = 'rack') {
    this.balls = createRack(layout); this.moving = false; this.accumulator = 0;
    this.shots = 0; this.scratch = false; this.layout = layout; this.breakPending = false;
    this.contacts = new Set(); this.nextContacts = new Set();
    this.hand=null;this.autoRespot=true;this.rollingFriction=ROLLING_FRICTION;
    this.frozenRails=new Set();
  }
  get cueBall() { return this.balls.find(b => b.id === 0); }
  get canShoot() { return !this.moving && !this.cueBall.pocketed && this.balls.some(b => b.id && !b.pocketed); }
  get canPlaceCue() { return !!this.hand && !this.moving || this.layout === 'rack' && this.shots === 0 && this.canShoot; }
  placeCue(z, x = null) {
    if (!this.canPlaceCue || !Number.isFinite(z)) return false;
    const clamped = Math.max(-HALF_Z + RADIUS + 0.02, Math.min(HALF_Z - RADIUS - 0.02, z));
    let placedX=BREAK_CUE_X;
    if(this.hand){
      if(!Number.isFinite(x))x=this.cueBall.x;
      placedX=Math.max(-HALF_X+RADIUS+.005,Math.min(this.hand==='kitchen'?HEAD_STRING_X-.001:HALF_X-RADIUS-.005,x));
      if(this.balls.some(b=>b.id&&!b.pocketed&&Math.hypot(b.x-placedX,b.z-clamped)<RADIUS*2+.002))return false;
      if(CUSHION_SEGMENTS.some(s=>{const [cx,cz]=closestPoint(s,placedX,clamped);return Math.hypot(cx-placedX,cz-clamped)<RADIUS;}))return false;
      if(POCKET_DETAILS.some(p=>{const local=pocketCoordinates(p,placedX,clamped);return local.depth>p.front&&Math.abs(local.lateral)<p.width;}))return false;
    }
    Object.assign(this.cueBall, { x: placedX, px: placedX, z: clamped, pz: clamped,y:RADIUS,py:RADIUS,pocketed:false,falling:false });
    return true;
  }
  shoot(angle, power) {
    if (!this.canShoot || !Number.isFinite(angle) || !Number.isFinite(power) || power < 0.025) return false;
    const speed = shotSpeed(power);
    this.breakPending = this.layout === 'rack' && this.shots === 0;
    this.frozenRails.clear();
    for(const b of this.balls)if(!b.pocketed)CUSHION_SEGMENTS.forEach((s,i)=>{
      const [x,z]=closestPoint(s,b.x,b.z);if(Math.hypot(x-b.x,z-b.z)<=RADIUS+.0001)this.frozenRails.add(b.id*32+i);
    });
    Object.assign(this.cueBall, { vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed, wx: 0, wz: 0 });
    this.moving = true; this.shots++; this.scratch = false;
    this.onEvent({ type: 'shot', speed, x: this.cueBall.x, z: this.cueBall.z });
    return true;
  }
  update(dt) {
    if (!this.moving) return;
    this.accumulator += Math.min(dt, 0.1);
    while (this.accumulator >= STEP) { this.step(STEP); this.accumulator -= STEP; }
    if (!this.balls.some(b => b.falling || (!b.pocketed && (Math.hypot(b.vx, b.vz) > STOP_SPEED || Math.hypot(b.wx, b.wz) * RADIUS > STOP_SPEED)))) {
      this.moving = false; this.accumulator = 0;
      for (const b of this.balls) { b.vx = b.vz = b.wx = b.wz = 0; b.px = b.x; b.pz = b.z; b.py = b.y; b.pqx=b.qx;b.pqy=b.qy;b.pqz=b.qz;b.pqw=b.qw; }
      if (this.cueBall.pocketed && this.autoRespot) this.respotCue();
      this.onEvent({ type: 'settled', scratch: this.scratch });
    }
  }
  step(dt) {
    for (const b of this.balls) {
      b.px = b.x; b.pz = b.z; b.py = b.y;
      b.pqx=b.qx;b.pqy=b.qy;b.pqz=b.qz;b.pqw=b.qw;
    }
    const active = this.balls.filter(b => !b.pocketed);
    for (const b of active) b.speed = Math.hypot(b.vx,b.vz);
    let nearContact = false;
    for (let i=0;i<active.length && !nearContact;i++) for(let j=i+1;j<active.length;j++) {
      const a=active[i],b=active[j];
      const reach=2*RADIUS + (a.speed+b.speed)*dt + .0001;
      const dx=a.x-b.x,dz=a.z-b.z;
      if(dx*dx+dz*dz<reach*reach) { nearContact=true; break; }
    }
    const count=nearContact ? CONTACT_SUBSTEPS : 1;
    for(let i=0;i<count;i++) this.substep(dt/count);
  }
  substep(dt) {
    for (const b of this.balls) {
      const startX=b.x,startZ=b.z;
      const oldWx = b.wx, oldWz = b.wz;
      if (b.falling) {
        b.vy -= GRAVITY * dt; b.y += b.vy * dt;
        const p = POCKET_DETAILS[b.pocketIndex];
        const target = pocketPoint(p, 0, p.roundCenter);
        const t = 1 - Math.exp(-12 * dt);
        b.x += (target[0] - b.x) * t; b.z += (target[1] - b.z) * t;
        if (b.y < -0.6) { b.falling = false; b.vx = b.vz = b.wx = b.wz = 0; }
      } else if (!b.pocketed && (b.vx || b.vz || b.wx || b.wz)) clothMotion(b, dt, this.rollingFriction);
      if((startX-HEAD_STRING_X)*(b.x-HEAD_STRING_X)<0)this.onEvent({type:'head-cross',id:b.id,forward:b.x>startX});
      if(startZ*b.z<0)this.onEvent({type:'center-cross',id:b.id});
      integrateRotation(b, (oldWx + b.wx) * 0.5, (oldWz + b.wz) * 0.5, dt);
    }
    const active = this.balls.filter(b => !b.pocketed);
    for (const b of active) { b.dvx=0; b.dvz=0; }
    const contacts = this.nextContacts; contacts.clear();
    for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      const dx = b.x - a.x, dz = b.z - a.z, distanceSquared = dx*dx+dz*dz;
      if (distanceSquared >= 4 * RADIUS * RADIUS) continue;
      const dist = Math.sqrt(distanceSquared);
      const nx = dist > 1e-9 ? dx / dist : 1, nz = dist > 1e-9 ? dz / dist : 0;
      const relative = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      const key=Math.min(a.id,b.id)*16+Math.max(a.id,b.id);
      contacts.add(key);
      if(relative>1e-6&&!this.contacts.has(key))this.onEvent({type:'contact',a:a.id,b:b.id});
      {
        const impulse = Math.max(0, CONTACT_STIFFNESS*(2*RADIUS-dist)+CONTACT_DAMPING*relative)*dt;
        a.dvx -= impulse * nx; a.dvz -= impulse * nz;
        b.dvx += impulse * nx; b.dvz += impulse * nz;
        if (relative > 0.045 && !this.contacts.has(key)) {
          const isBreak = this.breakPending && (!a.id || !b.id);
          if (isBreak) this.breakPending = false;
          this.onEvent({ type: 'collision', isBreak, speed: relative, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
        }
      }
    }
    this.nextContacts=this.contacts; this.contacts=contacts;
    for (const b of active) { b.vx+=b.dvx; b.vz+=b.dvz; }
    for(const key of this.frozenRails){const b=this.balls.find(b=>b.id===Math.floor(key/32)),s=CUSHION_SEGMENTS[key%32];
      const [x,z]=closestPoint(s,b.x,b.z);if(Math.hypot(x-b.x,z-b.z)>RADIUS+.0005)this.frozenRails.delete(key);
    }
    for (const b of active) {
      // Interior balls cannot hit a rail or reach a pocket this substep.
      if(Math.abs(b.x)<HALF_X-RADIUS && Math.abs(b.z)<HALF_Z-RADIUS) continue;
      for (const [segmentIndex,segment] of CUSHION_SEGMENTS.entries()) {
        const [x, z] = closestPoint(segment, b.x, b.z);
        const distance = Math.hypot(b.x - x, b.z - z);
        if (distance >= RADIUS) continue;
        const nx = distance > 1e-8 ? (b.x - x) / distance : segment.inward[0];
        const nz = distance > 1e-8 ? (b.z - z) / distance : segment.inward[1];
        b.x = x + nx * (RADIUS + 0.000001); b.z = z + nz * (RADIUS + 0.000001);
        const vn = b.vx * nx + b.vz * nz;
        if (vn < 0) {
          const restitution = (segment.jaw ? 0.73 : 0.86) - Math.min(0.07, Math.abs(vn) * 0.004);
          const tx = -nz, tz = nx, vt = (b.vx * tx + b.vz * tz) * 0.985;
          b.vx = -vn * restitution * nx + vt * tx;
          b.vz = -vn * restitution * nz + vt * tz;
          // Raised cushion nose partly redirects roll; the cloth resolves residual slip.
          b.wx = b.wx * 0.45 + b.vz / RADIUS * 0.55;
          b.wz = b.wz * 0.45 - b.vx / RADIUS * 0.55;
          if (-vn > 1e-6) this.onEvent({ type: 'cushion', id:b.id, fresh:!this.frozenRails.has(b.id*32+segmentIndex), speed: -vn, x, z, jaw: segment.jaw, inward:segment.inward });
        }
      }
      for (let i = 0; i < POCKET_DETAILS.length; i++) {
        const p = POCKET_DETAILS[i], local = pocketCoordinates(p, b.x, b.z);
        if (local.depth > p.fallDepth && local.depth < 0.6 && Math.abs(local.lateral) < p.width - RADIUS * 0.35) {
          const speed = Math.hypot(b.vx, b.vz);
          b.pocketed = b.falling = true; b.pocketIndex = i; b.vy = 0;
          if (!b.id) this.scratch = true;
          this.onEvent({ type: 'pocket', id: b.id, pocketIndex:i, speed, x: b.x, z: b.z });
          break;
        }
      }
      if(!b.pocketed&&(Math.abs(b.x)>HALF_X+.8||Math.abs(b.z)>HALF_Z+.8)){
        b.pocketed=true;b.vx=b.vz=b.wx=b.wz=0;this.onEvent({type:'off-table',id:b.id});
      }
    }
  }
  respotCue() {
    const b = this.cueBall;
    for (let x = -2.8; x < HALF_X - RADIUS; x += RADIUS * 2.2) for (let z = 0; z < HALF_Z - RADIUS; z += RADIUS * 2.2) {
      if (this.balls.every(other => !other.id || other.pocketed || Math.hypot(other.x - x, other.z - z) > RADIUS * 2.1)) {
        Object.assign(b, { x, z, px: x, pz: z, y: RADIUS, py: RADIUS, vx: 0, vz: 0, vy: 0, wx: 0, wz: 0, pocketed: false, falling: false });
        return;
      }
    }
  }
  aimTarget(angle) {
    const origin = this.cueBall, dx = Math.cos(angle), dz = Math.sin(angle);
    let distance = 15, target = null;
    const circleHit = (x, z, radius) => {
      const rx = x - origin.x, rz = z - origin.z, along = rx * dx + rz * dz;
      const perpendicular = rx * rx + rz * rz - along * along;
      if (along < 0 || perpendicular > radius * radius) return Infinity;
      const hit = along - Math.sqrt(Math.max(0, radius * radius - perpendicular));
      return hit >= -0.00001 ? Math.max(0, hit) : Infinity;
    };
    for (const b of this.balls) {
      if (!b.id || b.pocketed) continue;
      const hit = circleHit(b.x, b.z, RADIUS * 2);
      if (hit < distance) { distance = hit; target = b; }
    }
    // Ray versus capsule: offset straight faces and circular endpoint caps.
    for (const segment of CUSHION_SEGMENTS) {
      const tx0 = segment.b[0] - segment.a[0], tz0 = segment.b[1] - segment.a[1];
      const length = Math.hypot(tx0, tz0), tx = tx0 / length, tz = tz0 / length;
      const nx = -tz, nz = tx, denominator = dx * nx + dz * nz;
      let hit = Math.min(circleHit(...segment.a, RADIUS), circleHit(...segment.b, RADIUS));
      if (Math.abs(denominator) > 1e-9) for (const sign of [-1, 1]) {
        const d = (sign * RADIUS - ((origin.x - segment.a[0]) * nx + (origin.z - segment.a[1]) * nz)) / denominator;
        const along = (origin.x + dx * d - segment.a[0]) * tx + (origin.z + dz * d - segment.a[1]) * tz;
        if (d >= 0 && along >= 0 && along <= length) hit = Math.min(hit, d);
      }
      if (hit < distance) { distance = hit; target = null; }
    }
    for (const [position, direction, extent] of [[origin.x, dx, HALF_X + 0.2], [origin.z, dz, HALF_Z + 0.2]]) {
      if (Math.abs(direction) < 1e-9) continue;
      const d = (Math.sign(direction) * extent - position) / direction;
      if (d > 0 && d < distance) { distance = d; target = null; }
    }
    return { x: origin.x + dx * distance, z: origin.z + dz * distance, target };
  }
}
