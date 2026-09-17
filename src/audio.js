// Playback of recorded impacts only. No oscillator or synthetic sound fallback.
export class PoolAudio {
  constructor() {
    this.buffers = new Map(); this.enabled = true; this.voices = new Set(); this.sequence = 0;
    this.breakUntil = 0; this.lastCollisionTime = -Infinity; this.lastCollisionSpeed = 0;
  }
  get ready() { return [...this.buffers.values()].some(list => list.length); }
  async unlock() {
    this.context ??= new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === 'suspended') await this.context.resume();
  }
  async loadFiles(type, files) {
    await this.unlock();
    const decoded = [];
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) throw new Error('Mỗi tệp âm thanh cần nhỏ hơn 20 MB.');
      decoded.push(await this.context.decodeAudioData(await file.arrayBuffer()));
    }
    if (decoded.length) this.buffers.set(type, decoded);
    return decoded.length;
  }
  async loadManifest() {
    const response = await fetch('/audio/manifest.json');
    if (!response.ok) throw new Error('Không tải được danh sách bản thu âm thanh.');
    const manifest = await response.json();
    // Decoding works while suspended; only a user gesture should resume playback.
    this.context ??= new (window.AudioContext || window.webkitAudioContext)();
    const entries = await Promise.all(Object.entries(manifest).map(async ([type, urls]) => {
      if (!Array.isArray(urls) || !urls.length) return null;
      const clips = await Promise.all(urls.map(async url => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Không tải được bản thu âm thanh.');
        return this.context.decodeAudioData(await response.arrayBuffer());
      }));
      return [type, clips];
    }));
    for (const entry of entries) if (entry) this.buffers.set(...entry);
  }
  play(event, pan = 0) {
    if (!this.enabled || this.context?.state !== 'running' || !Number.isFinite(event.speed) || (event.type !== 'pocket' && event.speed < 0.06)) return;
    const now = this.context.currentTime;
    const isCollision = event.type === 'collision';
    if (isCollision && now < this.breakUntil) return;
    // The recording already contains the rack's overlapping impacts. Start it
    // at the first rack contact, never when the cue is released across the table.
    const isBreak = isCollision && event.isBreak && event.speed >= 8 && this.buffers.get('break')?.length;
    const clips = this.buffers.get(isBreak ? 'break' : event.type);
    if (!clips?.length) return;
    if (isCollision && !isBreak) {
      const elapsed = now - this.lastCollisionTime;
      if (event.speed < 4 && elapsed < 0.025) return;
      if (elapsed < 0.006 && event.speed <= this.lastCollisionSpeed * 1.15) return;
    }
    if (this.voices.size >= 16) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain(), panner = this.context.createStereoPanner();
    source.buffer = clips[this.sequence++ % clips.length];
    // Preserve recorded pitch. No loudness floor: a feather touch stays quiet.
    const level = event.type === 'pocket'
      ? 0.32 + 0.25 * Math.sqrt(Math.min(8, Math.max(0, event.speed)) / 8)
      : isBreak
      ? Math.min(0.86, 0.86 * (event.speed / 22.3) ** 0.7)
      : Math.min(0.72, 0.72 * (event.speed / 12) ** 0.85) / Math.sqrt(1 + this.voices.size * 0.25);
    gain.gain.value = event.type === 'cushion' ? level * 0.72 : level;
    panner.pan.value = Math.max(-0.75, Math.min(0.75, pan));
    source.connect(gain); gain.connect(panner); panner.connect(this.context.destination);
    this.voices.add(source);
    source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); panner.disconnect(); };
    source.start();
    if (isBreak) this.breakUntil = now + source.buffer.duration;
    if (isCollision) { this.lastCollisionTime = now; this.lastCollisionSpeed = event.speed; }
  }
}
