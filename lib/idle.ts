import * as THREE from 'three';

let idleTime = 0;
let idleEnabled = false;

/**
 * Enable procedural idle animation (breathing + sway)
 * Prevents T-pose freeze by continuously animating bones
 */
export function enableIdle() {
  const vrm = (window as any).vrm;

  if (!vrm) {
    console.error('[Idle] Cannot enable: VRM not loaded');
    return false;
  }

  if (!vrm.humanoid) {
    console.error('[Idle] Cannot enable: VRM has no humanoid');
    return false;
  }

  // Get bone nodes
  const spine = vrm.humanoid.getBoneNode('Spine');
  const chest = vrm.humanoid.getBoneNode('Chest');
  const neck = vrm.humanoid.getBoneNode('Neck');

  console.log('[Idle] Bones found:', {
    spine: !!spine,
    chest: !!chest,
    neck: !!neck,
  });

  if (!spine && !chest && !neck) {
    console.warn('[Idle] No bones found for idle animation');
    return false;
  }

  idleTime = 0;
  idleEnabled = true;

  (window as any).applyIdle = (dt: number) => {
    if (!idleEnabled) return;

    try {
      idleTime += dt;

      // Breathing motion (Spine X-axis) ~±1.7°
      const breath = Math.sin(idleTime * 1.2) * 0.03;

      // Body sway (Chest Z-axis) ~±1.1°
      const sway = Math.sin(idleTime * 0.6) * 0.02;

      // Apply rotations with safety clamping
      if (spine) {
        spine.rotation.x = THREE.MathUtils.clamp(breath, -0.1, 0.1);
      }

      if (chest) {
        chest.rotation.z = THREE.MathUtils.clamp(sway, -0.08, 0.08);
      }

      if (neck) {
        neck.rotation.y = THREE.MathUtils.clamp(sway * 0.8, -0.06, 0.06);
      }
    } catch (e) {
      console.error('[Idle] Error during idle animation:', e);
      // Don't disable idle on error, just log it
    }
  };

  console.log('[Idle] ✓ Idle animation enabled (breathing + sway)');
  return true;
}

/**
 * Disable idle animation
 */
export function disableIdle() {
  idleEnabled = false;
  (window as any).applyIdle = null;
  console.log('[Idle] ✓ Idle animation disabled');
}

/**
 * Check if idle is enabled
 */
export function isIdleEnabled(): boolean {
  return idleEnabled;
}
