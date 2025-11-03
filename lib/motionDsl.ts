import * as THREE from 'three';

const LIM = THREE.MathUtils.degToRad(45); // ±45° safety limit

/**
 * Set bone rotation with safety clamping
 */
function setBoneRot(
  vrm: any,
  boneName: string,
  axis: 'x' | 'y' | 'z',
  rad: number
): boolean {
  try {
    const node = vrm?.humanoid?.getNormalizedBoneNode(boneName);

    if (!node) {
      console.warn(`[Motion DSL] Bone "${boneName}" not found`);
      return false;
    }

    // Clamp to safety limits
    const r = THREE.MathUtils.clamp(rad, -LIM, LIM);

    // Apply rotation
    if (axis === 'x') node.rotation.x = r;
    if (axis === 'y') node.rotation.y = r;
    if (axis === 'z') node.rotation.z = r;

    return true;
  } catch (e) {
    console.error(`[Motion DSL] Error setting bone "${boneName}":`, e);
    return false;
  }
}

/**
 * Bone name mapping (our DSL names → VRM humanoid bone names)
 * VRM 0.x uses lowercase bone names
 */
const BONE_MAP: Record<string, string> = {
  Head: 'head',
  Neck: 'neck',
  Spine: 'spine',
  Chest: 'chest',
  LeftArm: 'leftUpperArm',
  RightArm: 'rightUpperArm',
  LeftLeg: 'leftUpperLeg',
  RightLeg: 'rightUpperLeg',
  Hips: 'hips',
};

/**
 * Apply Motion DSL plan to VRM avatar
 *
 * Plan format:
 * {
 *   gestures: [{
 *     t: number,           // start time (seconds)
 *     dur: number,         // duration (seconds)
 *     bone: string,        // bone name (Head, RightArm, etc.)
 *     action: 'rotate'|'reset',
 *     axis: 'x'|'y'|'z',
 *     dir: 'left'|'right'|'up'|'down'|'forward'|'back'|'center',
 *     amplitude: number    // 0-1 (multiplied by safety limit)
 *   }],
 *   duration_hint: number  // total duration
 * }
 */
export function applyMotionDSL(plan: any): boolean {
  const vrm = (window as any).vrm;

  if (!vrm) {
    console.error('[Motion DSL] Cannot apply: VRM not loaded');
    return false;
  }

  if (!vrm.humanoid) {
    console.error('[Motion DSL] Cannot apply: VRM has no humanoid');
    return false;
  }

  if (!plan || !Array.isArray(plan.gestures)) {
    console.error('[Motion DSL] Invalid plan format');
    return false;
  }

  const start = performance.now() / 1000;
  const gestures = plan.gestures;

  console.log(`[Motion DSL] ✓ Applying plan with ${gestures.length} gestures`);

  // Create motion update function
  (window as any).__motionUpdate = (dt: number) => {
    try {
      const now = performance.now() / 1000 - start;

      for (const g of gestures) {
        if (!g) continue;

        const {
          t = 0,
          dur = 0.6,
          bone,
          action = 'rotate',
          axis = 'y',
          dir = 'left',
          amplitude = 0.3,
        } = g;

        // Check if gesture is active
        if (now < t || now > t + dur) continue;

        // Calculate progress (0-1)
        const k = (now - t) / dur;

        // Apply easing (smooth cosine)
        const ease = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, k)));

        // Direction multiplier
        let sign = 0;
        if (dir === 'left' || dir === 'up' || dir === 'forward') sign = 1;
        else if (dir === 'right' || dir === 'down' || dir === 'back') sign = -1;
        else if (dir === 'center') sign = 0;

        // Calculate rotation
        const rad = sign * amplitude * LIM * ease;

        // Map bone name
        const target = BONE_MAP[bone] || bone;

        // Apply action
        if (action === 'rotate') {
          setBoneRot(vrm, target, axis as any, rad);
        } else if (action === 'reset') {
          setBoneRot(vrm, target, axis as any, 0);
        }
      }

      // Auto-stop when motion is complete
      if (now > (plan.duration_hint || 2.0)) {
        console.log('[Motion DSL] ✓ Motion complete');
        stopMotion();
      }
    } catch (e) {
      console.error('[Motion DSL] Error during motion update:', e);
    }
  };

  return true;
}

/**
 * Stop current motion
 */
export function stopMotion() {
  (window as any).__motionUpdate = null;
  console.log('[Motion DSL] ✓ Motion stopped');
}

/**
 * Reset all bones to neutral pose
 */
export function resetAllBones() {
  const vrm = (window as any).vrm;

  if (!vrm || !vrm.humanoid) {
    console.warn('[Motion DSL] Cannot reset: No VRM');
    return;
  }

  try {
    const boneNames = Object.keys(vrm.humanoid.humanBones || {});

    for (const boneName of boneNames) {
      const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
      if (bone) {
        bone.rotation.set(0, 0, 0);
      }
    }

    console.log('[Motion DSL] ✓ All bones reset to neutral');
  } catch (e) {
    console.error('[Motion DSL] Error resetting bones:', e);
  }
}
