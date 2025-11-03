import * as THREE from 'three';

let rafId: number | null = null;
const clock = new THREE.Clock();
let isRunning = false;

// Expose clock to window for debugging
(window as any).clock = clock;

/**
 * Start the main animation loop
 * Handles VRM updates, idle animation, and motion DSL execution
 */
export function startLoop(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
) {
  if (rafId) {
    console.warn('[Loop] Already running, stopping previous loop');
    cancelAnimationFrame(rafId);
  }

  isRunning = true;
  (window as any).__rafActive = true;

  console.log('[Loop] ✓ Animation loop starting');

  const tick = () => {
    if (!isRunning) {
      console.log('[Loop] Loop stopped');
      return;
    }

    try {
      // Get delta time
      const dt = clock.getDelta();

      // Update VRM (required for VRM animations)
      try {
        const vrm = (window as any).vrm;
        if (vrm && typeof vrm.update === 'function') {
          vrm.update(dt);
        }
      } catch (e) {
        console.error('[Loop] Error updating VRM:', e);
      }

      // Update idle animation
      try {
        if (typeof (window as any).applyIdle === 'function') {
          (window as any).applyIdle(dt);
        }
      } catch (e) {
        console.error('[Loop] Error in idle animation:', e);
      }

      // Update motion DSL
      try {
        if (typeof (window as any).__motionUpdate === 'function') {
          (window as any).__motionUpdate(dt);
        }
      } catch (e) {
        console.error('[Loop] Error in motion update:', e);
      }

      // Render scene
      try {
        renderer.render(scene, camera);
      } catch (e) {
        console.error('[Loop] Error rendering scene:', e);
      }

      // Schedule next frame
      rafId = requestAnimationFrame(tick);
    } catch (e) {
      console.error('[Loop] Critical error in animation loop:', e);
      // Try to recover by continuing the loop
      rafId = requestAnimationFrame(tick);
    }
  };

  // Start the loop
  tick();
  console.log('[Loop] ✓ Animation loop active');
}

/**
 * Stop the animation loop
 */
export function stopLoop() {
  isRunning = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
    (window as any).__rafActive = false;
    console.log('[Loop] ✓ Animation loop stopped');
  }
}

/**
 * Check if loop is running
 */
export function isLoopRunning(): boolean {
  return isRunning;
}
