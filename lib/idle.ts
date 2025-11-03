import * as THREE from 'three';

export function enableIdle() {
  const vrm = (window as any).vrm;
  if (!vrm) {
    console.warn('Cannot enable idle: VRM not loaded');
    return;
  }

  const spine = vrm?.humanoid?.getBoneNode('Spine');
  const chest = vrm?.humanoid?.getBoneNode('Chest');
  const neck = vrm?.humanoid?.getBoneNode('Neck');

  let t = 0;

  (window as any).applyIdle = (dt: number) => {
    t += dt;
    const breath = Math.sin(t * 1.2) * 0.03; // ~±1.7°
    const sway = Math.sin(t * 0.6) * 0.02; // ~±1.1°

    if (spine) spine.rotation.x = THREE.MathUtils.clamp(breath, -0.1, 0.1);
    if (chest) chest.rotation.z = THREE.MathUtils.clamp(sway, -0.08, 0.08);
    if (neck) neck.rotation.y = THREE.MathUtils.clamp(sway * 0.8, -0.06, 0.06);
  };

  console.log('Idle enabled (breathing + sway)');
}

export function disableIdle() {
  (window as any).applyIdle = null;
  console.log('Idle disabled');
}
