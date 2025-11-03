import * as THREE from 'three';

let rafId: number | null = null;
const clock = new THREE.Clock();
(window as any).clock = clock;

export function startLoop(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
) {
  if (rafId) cancelAnimationFrame(rafId);
  (window as any).__rafActive = true;

  const tick = () => {
    const dt = clock.getDelta();

    // Update VRM
    (window as any).vrm?.update?.(dt);

    // Update mixer if exists
    (window as any).mixer?.update?.(dt);

    // Procedural idle hook
    (window as any).applyIdle?.(dt);

    // Motion DSL hook
    (window as any).__motionUpdate?.(dt);

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  };

  console.log('Animation loop started');
  tick();
}

export function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
    (window as any).__rafActive = false;
    console.log('Animation loop stopped');
  }
}
