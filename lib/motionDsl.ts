// lib/motionDsl.ts
// DAXON — VRM BODY CONTROL (Strong Smooth Version, fixed for Next.js)
// - Smooth blending per-bone (exponential smoothing / lerp)
// - Head-gesture limiter (anti-spam)
// - Micro-variation (±5%) for natural feel
// - Continuity: no snaps to bind; blend from previous
// - Actions: rotate | reset | hold | move (Hips only, tiny translation)
// - Safe for Next.js: guards window access (SSR)

import * as THREE from 'three';

const DEG45 = THREE.MathUtils.degToRad(45);   // safety limit ±45°
const HEAD_COOLDOWN_MS_DEFAULT = 1500;        // min interval between head gestures
const JITTER_PCT_DEFAULT = 0.05;              // ±5% tiny randomness
const TAU_DEFAULT = 0.25;                     // smoothing time-constant (sec)

// Runtime state
type Axis = 'x' | 'y' | 'z';
type Action = 'rotate' | 'reset' | 'hold' | 'move';

interface Gesture {
  t?: number;
  dur?: number;
  bone: keyof typeof BONE_MAP | string;
  action?: Action;
  axis?: Axis;
  dir?: 'up'|'down'|'left'|'right'|'forward'|'back'|'center';
  amplitude?: number;         // 0..1
  ease?: 'in'|'out'|'inout'|'linear';
  note?: string;
}

interface MotionPlan {
  gestures: Gesture[];
  duration_hint?: number;
}

interface Options {
  tau?: number;               // smoothing time-constant
  headCooldownMs?: number;    // anti-spam
  jitterPct?: number;         // micro-variation
  replace?: boolean;          // replace current plan (default: true)
  queue?: boolean;            // queue after current plan (default: false)
}

const BONE_MAP: Record<string, string> = {
  Head:       'head',
  Neck:       'neck',
  Spine:      'spine',
  Chest:      'chest',
  LeftArm:    'leftUpperArm',
  RightArm:   'rightUpperArm',
  LeftLeg:    'leftUpperLeg',
  RightLeg:   'rightUpperLeg',
  Hips:       'hips',
};

const prevRot: Record<string, {x:number; y:number; z:number}> = {};
let lastHeadMs = 0;
let activeEndTime = 0;
let queuedPlan: MotionPlan | null = null;

// Helpers
function clampRad(r:number) { return THREE.MathUtils.clamp(r, -DEG45, DEG45); }
function lerp(a:number,b:number,t:number){ return a + (b-a)*t; }
function jitter(v:number, pct:number) { return v * (1 + (Math.random()*2-1) * pct); }

function easeVal(kind: Gesture['ease']|undefined, k: number) {
  const kk = THREE.MathUtils.clamp(k, 0, 1);
  switch (kind) {
    case 'in':     return 1 - Math.cos((kk * Math.PI) / 2);
    case 'out':    return Math.sin((kk * Math.PI) / 2);
    case 'linear': return kk;
    case 'inout':
    default:       return 0.5 - 0.5 * Math.cos(Math.PI * kk); // cosine in-out
  }
}

// Try both normalized and raw bone nodes (VRM0 vs VRM1 compatibility)
function getBoneNode(vrm: any, boneName: string) {
  try {
    const n1 = vrm?.humanoid?.getNormalizedBoneNode?.(boneName);
    if (n1) return n1;
    const n2 = vrm?.humanoid?.getBoneNode?.(boneName);
    if (n2) return n2;
  } catch {}
  return null;
}

function setBoneRot(vrm:any, boneName:string, axis:Axis, targetRad:number, tau:number, dt:number) {
  const node = getBoneNode(vrm, boneName);
  if (!node) return;

  const key = boneName; // per-bone cache
  const rec = prevRot[key] || { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z };

  // convert tau to blend alpha per frame (exponential smoothing)
  const alpha = 1 - Math.exp(-Math.max(dt, 0) / Math.max(tau, 0.0001)); // 0..1

  const tgt = clampRad(targetRad);
  if (axis === 'x') rec.x = lerp(rec.x, tgt, alpha);
  if (axis === 'y') rec.y = lerp(rec.y, tgt, alpha);
  if (axis === 'z') rec.z = lerp(rec.z, tgt, alpha);

  prevRot[key] = rec;
  node.rotation.set(rec.x, rec.y, rec.z);
}

// tiny translation for Hips (demo); keep limits to avoid breaking rig
const MOVE_LIMIT = 0.05; // meters max offset in any axis
function setHipsMove(vrm:any, axis:Axis, dir:'forward'|'back'|'left'|'right'|'up'|'down'|'center', amt01:number, tau:number, dt:number) {
  try {
    const hips = getBoneNode(vrm, 'hips');
    if (!hips) return;

    const alpha = 1 - Math.exp(-Math.max(dt, 0) / Math.max(tau, 0.0001));
    const target = new THREE.Vector3().copy(hips.position);

    const delta = MOVE_LIMIT * THREE.MathUtils.clamp(amt01, 0, 1);
    if (dir === 'forward') target.z -= delta;
    if (dir === 'back')    target.z += delta;
    if (dir === 'left')    target.x -= delta;
    if (dir === 'right')   target.x += delta;
    if (dir === 'up')      target.y += delta * 0.5;
    if (dir === 'down')    target.y -= delta * 0.5;
    if (dir === 'center')  target.set(0,0,0);

    hips.position.lerp(target, alpha);
    hips.updateMatrixWorld();
  } catch {}
}

// Anti head-spam: allow at most one head-rotate gesture per cooldown window
function allowHeadGesture(headCooldownMs:number) {
  const t = performance.now();
  if (t - lastHeadMs < headCooldownMs) return false;
  lastHeadMs = t;
  return true;
}

function buildRunner(plan: MotionPlan, options: Required<Options>) {
  const startTime = performance.now() / 1000;
  const gestures = Array.isArray(plan?.gestures) ? plan.gestures : [];
  const jitterPct = options.jitterPct;

  // Pre-jitter plan (tiny natural variation)
  const gList = gestures.map(g => {
    const copy = { ...g };
    copy.dur = Math.max(0.05, (g.dur ?? 0.6) * (1 + (Math.random()*2-1)*jitterPct));
    copy.amplitude = Math.max(0, (g.amplitude ?? 0.3) * (1 + (Math.random()*2-1)*jitterPct));
    return copy;
  });

  const duration = Math.max(0.3, plan.duration_hint ?? 2.0);
  activeEndTime = startTime + duration;

  (window as any).__motionUpdate = (dt: number) => {
    try {
      const vrm = (window as any).vrm;
      if (!vrm?.humanoid) return;

      const now = performance.now() / 1000;
      const tRel = now - startTime;

      // If done, stop and maybe run queued plan
      if (tRel > duration) {
        (window as any).__motionUpdate = null;
        if (queuedPlan) {
          const next = queuedPlan; queuedPlan = null;
          buildRunner(next, options);
        }
        return;
      }

      for (const g of gList) {
        if (!g) continue;
        const {
          t = 0,
          bone,
          action = 'rotate',
          axis = 'y',
          dir = 'center',
          amplitude = 0.3,
          ease = 'inout',
          dur = 0.6
        } = g;

        if (tRel < t || tRel > t + dur) continue;

        const k = (tRel - t) / dur;
        const e = easeVal(ease, k);

        const mapName = BONE_MAP[bone as string] || (bone as string);
        const lower = (mapName || '').toLowerCase(); // VRM0 uses lowercase
        const isHead = lower === 'head';

        // direction to sign
        let sign = 0;
        if (dir === 'left' || dir === 'up' || dir === 'forward') sign = 1;
        else if (dir === 'right' || dir === 'down' || dir === 'back') sign = -1;
        else if (dir === 'center') sign = 0;

        if (action === 'move') {
          if (lower === 'hips') setHipsMove(vrm, axis, dir as any, amplitude * e, options.tau, dt);
          continue;
        }

        if (action === 'reset') {
          setBoneRot(vrm, lower, axis, 0, options.tau, dt);
          continue;
        }

        if (action === 'hold') {
          // keep last filtered value — do nothing (low-pass will settle slowly)
          continue;
        }

        // rotate
        if (isHead) {
          // only gate at gesture start (k ~ 0)
          if (k < 0.05 && !allowHeadGesture(options.headCooldownMs)) {
            // skip this head gesture
            continue;
          }
        }

        const rad = sign * (amplitude ?? 0.3) * DEG45 * e;
        setBoneRot(vrm, lower, axis, rad, options.tau, dt);
      }
    } catch (err) {
      console.error('[Motion DSL] update error:', err);
    }
  };
}

// Public API
export function applyMotionDSL(plan: MotionPlan, opts?: Options): boolean {
  // SSR guard for Next.js build
  if (typeof window === 'undefined') {
    // during build or on server, just no-op to avoid crashes
    return false;
  }

  const vrm = (window as any).vrm;
  if (!vrm) { console.error('[Motion DSL] Cannot apply: VRM not loaded'); return false; }
  if (!vrm.humanoid) { console.error('[Motion DSL] Cannot apply: VRM has no humanoid'); return false; }
  if (!plan || !Array.isArray(plan.gestures)) { console.error('[Motion DSL] Invalid plan'); return false; }

  const options: Required<Options> = {
    tau:            opts?.tau ?? TAU_DEFAULT,
    headCooldownMs: opts?.headCooldownMs ?? HEAD_COOLDOWN_MS_DEFAULT,
    jitterPct:      opts?.jitterPct ?? JITTER_PCT_DEFAULT,
    replace:        opts?.replace ?? true,
    queue:          opts?.queue ?? false
  };

  console.log(`[Motion DSL] ▶ plan(${plan.gestures.length} gestures), tau=${options.tau}, headCD=${options.headCooldownMs}ms`);

  if (options.replace) {
    queuedPlan = null;
    buildRunner(plan, options);
    return true;
  }

  if (options.queue) {
    const hasRunner = typeof (window as any).__motionUpdate === 'function' && performance.now()/1000 < activeEndTime;
    if (hasRunner) queuedPlan = plan;
    else buildRunner(plan, options);
    return true;
  }

  buildRunner(plan, options);
  return true;
}

export function stopMotion() {
  if (typeof window === 'undefined') return;
  (window as any).__motionUpdate = null;
  queuedPlan = null;
  console.log('[Motion DSL] ✓ Motion stopped');
}

export function resetAllBones() {
  if (typeof window === 'undefined') return;
  const vrm = (window as any).vrm;
  if (!vrm?.humanoid) { console.warn('[Motion DSL] Cannot reset: no VRM'); return; }
  try {
    const bones = Object.keys(vrm.humanoid.humanBones || {});
    for (const bn of bones) {
      const node = getBoneNode(vrm, bn);
      if (node) {
        node.rotation.set(0,0,0);
        if (bn === 'hips') { node.position.set(0,0,0); }
        node.updateMatrixWorld();
      }
    }
    console.log('[Motion DSL] ✓ All bones reset');
  } catch (e) {
    console.error('[Motion DSL] reset error:', e);
  }
}

// Optional tuners (call from console/UI on client)
export function setHeadCooldown(ms:number) {
  if (typeof window === 'undefined') return;
  lastHeadMs = 0;
  (window as any).__headCooldownMs = ms;
}

export function setSmoothingTau(sec:number) {
  if (typeof window === 'undefined') return;
  (window as any).__tau = sec;
}
