import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BALL_COLORS, STEP } from './physics.js';
import { HALF_X, HALF_Z, OUTER_X, OUTER_Z, RADIUS, CLOTH_Y as Y, FOOT_SPOT_X, POCKET_DETAILS } from './table-model.js';
import { buildTournamentTable, texture, RAIL_SURFACE_Y } from './table-visual.js';
import { cueElevation, cuePose, CUE_IDLE_GAP, CUE_DRAW } from './cue-pose.js';
import {mountCueCamera} from './cue-camera.js';
import {mountContactAid} from './contact-aid.js';
import {localPointer,screenProjection} from './screen-coordinates.js';
import {mountTouchAim} from './touch-aim.js';

const UP = new THREE.Vector3(0, 1, 0);
const CUE_AXIS = new THREE.Vector3(1, 0, 0);
const poseAxis = new THREE.Vector3();
const nextRotation = new THREE.Quaternion();
function ballTexture(id) {
  return texture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = id > 8 ? '#fffef5' : BALL_COLORS[id]; ctx.fillRect(0, 0, w, h);
    if (id > 8) { ctx.fillStyle = BALL_COLORS[id]; ctx.fillRect(0, h * 0.27, w, h * 0.46); }
    if (!id) {
      ctx.fillStyle = '#000000';
      for (const x of [0.125, 0.375, 0.625, 0.875]) {
        ctx.beginPath(); ctx.ellipse(x * w, h / 2, 28, 28, 0, 0, Math.PI * 2); ctx.fill();
      }
      // UV bands become circular caps at the two poles of the sphere.
      // Together with the four equatorial dots these mark six opposing directions.
      ctx.fillRect(0, 0, w, 28);
      ctx.fillRect(0, h - 28, w, 28);
      return;
    }
    // Paint directly onto the sphere so the numbers roll with its physical rotation.
    for (const x of [w / 4, w * 3 / 4]) {
      ctx.beginPath(); ctx.ellipse(x, h / 2, 102, 102, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fffdf4'; ctx.fill();
      ctx.fillStyle = '#10151b'; ctx.font = `bold ${id < 10 ? 144 : 126}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#10151b'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.strokeText(String(id), x, h / 2 + 5);
      ctx.fillText(String(id), x, h / 2 + 5);
    }
  });
}

export class PoolScene {
  constructor(container, physics, onAim = () => {}) {
    this.container = container; this.physics = physics; this.onAim = onAim;
    this.angle = physics.layout === 'rack' ? 0 : -0.281; this.power = 0; this.view = 'orbit'; this.aimVisible = true;
    this.inputLocked = false; this.ballMeshes = new Map(); this.ballShadows = new Map();
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#161b21');
    this.scene.fog = new THREE.FogExp2('#161b21', 0.024);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.06, 85);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.setAttribute('aria-label', 'Bàn bida 3D. Chạm để ngắm. Chuột phải xoay ở góc 3D.');
    container.appendChild(this.renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(this.renderer), environment = new RoomEnvironment();
    const reflectionPanel = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 7, 7), side: THREE.DoubleSide }));
    reflectionPanel.position.set(0, 5, 0); reflectionPanel.rotation.x = Math.PI / 2;
    environment.add(reflectionPanel);
    this.environmentTarget = pmrem.fromScene(environment, 0.025);
    this.scene.environment = this.environmentTarget.texture; this.scene.environmentIntensity = 0.45;
    // A broad overhead softbox for balls, rather than the room's many tiny lights.
    // Stable, blurred reflections avoid bright grazing rings and sparkling pixels.
    const ballStudio = new THREE.Scene(); ballStudio.background = new THREE.Color('#737985');
    const softbox = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2), side: THREE.DoubleSide }));
    softbox.position.set(-1, 5, 1); softbox.rotation.x = Math.PI / 2; ballStudio.add(softbox);
    this.ballEnvironmentTarget = pmrem.fromScene(ballStudio, 0.12);
    softbox.geometry.dispose(); softbox.material.dispose();
    environment.dispose(); pmrem.dispose();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.075;
    this.controls.enablePan = false; this.controls.minDistance = 3; this.controls.maxDistance = 28;
    this.controls.enableZoom = false;
    this.controls.mouseButtons.MIDDLE = null;
    this.controls.touches.TWO = null;
    this.controls.minPolarAngle = 0.01; this.controls.maxPolarAngle = Math.PI * 0.44;
    this.controls.rotateSpeed = 0.18;
    this.controls.mouseButtons.LEFT=null;this.controls.mouseButtons.RIGHT=THREE.MOUSE.ROTATE;
    this.controls.touches.ONE=null;
    this.cueCamera=mountCueCamera(this);
    this.contactAid=mountContactAid(this);
    this.buildRoom();
    const materials = buildTournamentTable(this.scene, this.renderer);
    this.feltMaterial = materials.felt; this.cushionMaterial = materials.cushion;
    this.buildBalls(); this.buildCue(); this.buildGuide(); this.bindInput();
    this.resize(); this.setView('orbit');
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
    this.lastTime = performance.now();
    this.tick = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.tick);
  }
  buildRoom() {
    this.scene.add(new THREE.HemisphereLight('#e3efff', '#192027', 0.8));
    const key = new THREE.DirectionalLight('#fff8ed', 2.2); key.position.set(-2.5, 9, 2);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: 0.5, far: 23 });
    key.shadow.normalBias = 0.012; key.shadow.bias = -0.0002; key.shadow.radius = 3;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#d5e8ff', 1.8); rim.position.set(2, 6, -5); this.scene.add(rim);
    // Quiet studio floor: no labels, rugs or decorative objects around the table.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: '#35404c' }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.53; floor.receiveShadow = true; this.scene.add(floor);
  }
  buildBalls() {
    const geometry = new THREE.SphereGeometry(RADIUS, 48, 32);
    for (let id = 0; id <= 15; id++) {
      const map = ballTexture(id); map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      const material = id === 0
        ? new THREE.MeshLambertMaterial({ map })
        : new THREE.MeshStandardMaterial({ map, roughness: 0.46, metalness: 0, envMap: this.ballEnvironmentTarget.texture, envMapIntensity: 0.3 });
      const ball = new THREE.Mesh(geometry, material); ball.rotation.set(0.4, -0.7, 0.4);
      ball.castShadow = false; ball.receiveShadow = false; this.scene.add(ball); this.ballMeshes.set(id, ball);
      // No separate moving shadow disc: lighting on the sphere supplies its volume.
    }
    this.syncBalls(0);
  }
  buildCue() {
    this.cue = new THREE.Group();
    for (const [r1, r2, length, color, x] of [
      [0.02, 0.036, 1.65, '#d6bc8f', -1.0], [0.036, 0.044, 0.92, '#172531', -2.285],
      [0.038, 0.038, 0.028, '#c9c2a9', -1.85], [0.02, 0.02, 0.055, '#fff5da', -0.148],
      [0.021, 0.021, 0.023, '#5b93a4', -0.109], [0.045, 0.045, 0.035, '#080c11', -2.76],
    ]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, length, 32), new THREE.MeshStandardMaterial({ color, roughness: 0.3 }));
      m.rotation.z = -Math.PI / 2; m.position.x = x; m.castShadow = false; this.cue.add(m);
    }
    this.scene.add(this.cue);
  }
  buildGuide() {
    this.pocketLabels = new THREE.Group();this.pocketLabels.visible=false;
    POCKET_DETAILS.forEach((p,i)=>{
      const map=texture(64,64,(ctx)=>{ctx.fillStyle='#e9dcc3';ctx.font='bold 42px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),32,32);});
      const label=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false,transparent:true}));
      label.position.set(p.x,Y+.32,p.z);label.scale.set(.18,.18,1);this.pocketLabels.add(label);
    });this.scene.add(this.pocketLabels);
    this.guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: '#f1f4eb', dashSize: 0.075, gapSize: 0.085, transparent: true, opacity: 0.4 }));
    this.scene.add(this.guide);
    this.ghost = new THREE.Mesh(new THREE.RingGeometry(RADIUS * 0.98, RADIUS * 1.025, 80), new THREE.MeshBasicMaterial({ color: '#f5f4e7', transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    this.ghost.rotation.x = -Math.PI / 2; this.scene.add(this.ghost);
  }
  bindInput() {
    mountTouchAim(this);
    const element = this.renderer.domElement; let down = null;
    const tableHit = event => {
      const rect = element.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      const p=localPointer(element,event);ray.setFromCamera(new THREE.Vector2(p.u*2-1,1-p.v*2), this.camera);
      return ray.ray.intersectPlane(new THREE.Plane(UP, -Y - RADIUS), new THREE.Vector3());
    };
    this.cancelPlacement = (restore = true) => {
      const placement = this.placingCue;
      if (!placement) return;
      this.placingCue = null;
      if (restore) { this.physics.placeCue(placement.startZ,placement.startX); this.angle = placement.startAngle; }
      this.controls.enabled = placement.controlsEnabled; this.inputLocked = false;
      if (element.hasPointerCapture(placement.id)) element.releasePointerCapture(placement.id);
      element.style.cursor = ''; this.guideKey = null; this.onPlacement?.();
    };
    // Capture before OrbitControls, so dragging the cue ball never rotates the table.
    element.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || this.inputLocked || this.striking || this.canInteract?.()===false || !this.physics.canPlaceCue) return;
      const b = this.physics.cueBall, center = this.project(b.x, b.z, Y + RADIUS);
      const edge = this.project(b.x, b.z + RADIUS, Y + RADIUS);
      const tolerance = Math.max(event.pointerType === 'touch' ? 22 : 14, Math.hypot(edge.x - center.x, edge.y - center.y) + 5);
      if (Math.hypot(event.clientX - center.x, event.clientY - center.y) > tolerance) return;
      const hit = tableHit(event); if (!hit) return;
      event.preventDefault(); event.stopImmediatePropagation(); down = null;
      this.placingCue = { id: event.pointerId, startZ: b.z, startX:b.x, startAngle: this.angle, offset: b.z - hit.z, offsetX:b.x-hit.x, controlsEnabled: this.controls.enabled };
      this.controls.enabled = false; this.inputLocked = true; element.setPointerCapture(event.pointerId);
      element.style.cursor = 'grabbing'; this.onPlacement?.();
    }, { capture: true });
    element.addEventListener('pointermove', event => {
      if (!this.placingCue || event.pointerId !== this.placingCue.id) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const hit = tableHit(event); if (!hit) return;
      this.physics.placeCue(hit.z + this.placingCue.offset,hit.x+this.placingCue.offsetX);
      const b = this.physics.cueBall;
      this.angle = Math.atan2(-b.z, FOOT_SPOT_X - b.x); this.guideKey = null;
      this.onAim(this.angle);
    }, { capture: true });
    element.addEventListener('pointerup', event => {
      if (event.pointerId !== this.placingCue?.id) return;
      event.preventDefault(); event.stopImmediatePropagation(); this.cancelPlacement(false);
    }, { capture: true });
    element.addEventListener('pointercancel', () => this.cancelPlacement());
    element.addEventListener('lostpointercapture', () => this.cancelPlacement());
    window.addEventListener('blur', () => this.cancelPlacement());
    window.addEventListener('keydown', event => { if (event.code === 'Escape') this.cancelPlacement(); });
    element.addEventListener('pointerdown', e => { if (e.isPrimary && e.button === 0) down = { x: e.clientX, y: e.clientY }; });
    element.addEventListener('pointercancel', () => { down = null; });
    element.addEventListener('pointerup', e => {
      if (e.pointerType==='touch'||!down || this.cameraGesture || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || !this.physics.canShoot || this.inputLocked || this.canInteract?.()===false) { down = null; return; }
      down = null;
      const rect = element.getBoundingClientRect();
      const p=localPointer(element,e),point = new THREE.Vector2(p.u*2-1,1-p.v*2);
      const ray = new THREE.Raycaster(); ray.setFromCamera(point, this.camera);
      const hit = ray.ray.intersectPlane(new THREE.Plane(UP, -Y), new THREE.Vector3());
      if (!hit || Math.abs(hit.x) > HALF_X + 0.2 || Math.abs(hit.z) > HALF_Z + 0.2) return;
      this.angle = Math.atan2(hit.z - this.physics.cueBall.z, hit.x - this.physics.cueBall.x);
      this.onAim(this.angle);
    });
  }
  setCloth(color) {
    const cloth = { gray: '#343a3d', green: '#285634', blue: '#20495c', wine: '#502b36' }[color] || '#343a3d';
    this.feltMaterial.color.set(cloth);
    this.cushionMaterial.color.set(cloth);
    this.cushionMaterial.emissive.set(cloth);
  }
  setView(view,preserveCamera=false) {
    this.view = view;this.cueCamera.configure(view==='cue');
    if(view==='cue'&&preserveCamera)return;
    // Clear damping inertia so a preset always lands at the same fitted camera.
    this.controls.enableDamping = false; this.controls.update();
    const area = this.playArea();
    const portrait = area.width / area.height < 1.05;
    this.camera.up.set(0, 1, 0);
    if (view === 'top') {
      if (portrait) this.camera.up.set(1, 0, 0);
      this.fitTable(new THREE.Vector3(0, 1, 0.00001));
    } else if (view === 'cue') {
      this.cueCamera.reset();
    } else this.fitTable(portrait ? new THREE.Vector3(6, 18, 0.45) : new THREE.Vector3(3.3, 9.6, 11));
    this.controls.update(); this.controls.enableDamping = true;
  }
  fitTable(direction) {
    direction.normalize();
    const target = new THREE.Vector3(0, -0.03, 0);
    const right = new THREE.Vector3().crossVectors(this.camera.up, direction).normalize();
    const vertical = new THREE.Vector3().crossVectors(direction, right).normalize();
    const area = this.playArea(), aspect = area.width / area.height;
    const tangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    let distance = 5;
    for (const x of [-OUTER_X, OUTER_X]) for (const y of [-0.75, 0.3]) for (const z of [-OUTER_Z, OUTER_Z]) {
      const corner = new THREE.Vector3(x, y, z).sub(target), depth = corner.dot(direction);
      distance = Math.max(distance, Math.abs(corner.dot(right)) / (tangent * aspect * 0.91) + depth, Math.abs(corner.dot(vertical)) / (tangent * 0.90) + depth);
    }
    this.camera.position.copy(target).addScaledVector(direction, distance); this.controls.target.copy(target);
    this.controls.maxDistance = Math.max(28, distance * 1.5);
  }
  resize() {
    const width = this.container.clientWidth, height = this.container.clientHeight;
    if (!width || !height) return;
    // Bound pixel work on high-DPI displays without tying physics to resolution.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75, Math.sqrt(2200000 / (width * height))));
    const area = this.playArea();
    // Render the floor across the entire viewport while reserving space to the right for the cue.
    this.camera.setViewOffset(area.width, area.height, 0, -area.margin, width, height);
    this.renderer.setSize(width, height);
    if (this.lastSize && (width !== this.lastSize[0] || height !== this.lastSize[1])) this.setView(this.view,true);
    this.lastSize = [width, height];
  }
  playArea() {
    const width = this.container.clientWidth, height = this.container.clientHeight;
    if(document.querySelector('#game')?.classList.contains('phone-play'))return {width,height,margin:0};
    const gutter = width <= 700 || height <= 500 ? 74 : 100;
    const margin = width <= 700 && height > 500 ? 40 : 0;
    return { width: Math.max(150, width - gutter), height: height - 2 * margin, margin };
  }
  syncBalls(dt) {
    const alpha = this.physics.moving ? this.physics.accumulator / STEP : 1;
    for (const b of this.physics.balls) {
      const ball = this.ballMeshes.get(b.id); ball.visible = !b.pocketed || b.falling;
      ball.position.set(THREE.MathUtils.lerp(b.px, b.x, alpha), Y + THREE.MathUtils.lerp(b.py, b.y, alpha), THREE.MathUtils.lerp(b.pz, b.z, alpha));
      ball.quaternion.set(b.pqx, b.pqy, b.pqz, b.pqw);
      nextRotation.set(b.qx, b.qy, b.qz, b.qw);
      ball.quaternion.slerp(nextRotation, alpha);
    }
  }
  strike(power, onImpact) {
    if (!this.physics.canShoot || this.striking) return false;
    this.striking = { start: performance.now(), power, onImpact, hit: false, x: this.physics.cueBall.x, z: this.physics.cueBall.z };
    return true;
  }
  animate(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.06); this.lastTime = time;
    if(this.suspended){this.frame=requestAnimationFrame(this.tick);return;}
    let motionDt = dt;
    const b = this.physics.cueBall;
    let pull = this.power, showCue = this.physics.canShoot && this.showCue!==false;
    if (this.striking) {
      const s = this.striking, elapsed = time - s.start;
      // One short, linear forward stroke; no slow-start spring-like easing.
      const progress = Math.min(1, elapsed / 60);
      pull = THREE.MathUtils.lerp(s.power, -CUE_IDLE_GAP / CUE_DRAW, progress);
      if (elapsed >= 60 && !s.hit) {
        s.hit = true; s.onImpact();
        // Simulate only the part of this frame after contact, then render it now.
        motionDt = Math.min(dt, (elapsed - 60) / 1000);
      }
      showCue = !s.hit;
      if (elapsed >= 80) this.striking = null;
    }
    this.physics.update(motionDt);
    showCue = showCue && !this.physics.moving;
    this.cue.visible = showCue;
    const origin = this.striking || b;
    const bridgeKey = `${origin.x}:${origin.z}:${this.angle}`;
    if (showCue && bridgeKey !== this.bridgeKey) {
      this.bridgeKey = bridgeKey;
      this.cueElevation = cueElevation(origin, this.angle, RAIL_SURFACE_Y, this.tip);
    }
    if (showCue) {
      const pose = cuePose(origin, this.angle, pull, this.cueElevation, this.tip);
      this.cue.position.fromArray(pose.position);
      this.cue.quaternion.setFromUnitVectors(CUE_AXIS, poseAxis.fromArray(pose.axis));
    }
    // Only the static table casts shadows. No moving cue/ball shadow or trail,
    // and no shadow-map rebuild during the stroke or rolling animation.
    this.guide.visible = this.physics.canShoot && this.aimVisible && !this.striking && this.showCue!==false && !(this.view==='cue'&&this.contactAidEnabled);
    this.ghost.visible = this.guide.visible && this.ghostEnabled!==false;
    if (this.guide.visible) {
      const key = `${this.angle}:${b.x}:${b.z}:${this.physics.shots}`;
      if (key !== this.guideKey) { this.guideKey = key; this.guideTarget = this.physics.aimTarget(this.angle); }
      const target = this.guideTarget;
      const positions = this.guide.geometry.attributes.position;
      positions.setXYZ(0, b.x, Y + RADIUS, b.z); positions.setXYZ(1, target.x, Y + RADIUS, target.z);
      positions.needsUpdate = true; this.guide.geometry.computeBoundingSphere(); this.guide.computeLineDistances();
      this.ghost.position.set(target.x, Y + 0.002, target.z);
    }

    this.contactAidText=this.contactAid.update();this.cueCamera.update();this.controls.update(); this.syncBalls(0); this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  }
  project(x, z, y = Y) {
    const point = new THREE.Vector3(x, y, z).project(this.camera), rect = this.renderer.domElement.getBoundingClientRect();
    return screenProjection(this.renderer.domElement,(point.x+1)/2,(1-point.y)/2);
  }
}
