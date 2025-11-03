import * as THREE from 'three';

const LIM = THREE.MathUtils.degToRad(45);

function setBoneRot(
  vrm: any,
  boneName: string,
  axis: 'x' | 'y' | 'z',
  rad: number
) {
  const node = vrm?.humanoid?.getBoneNode(boneName);
  if (!node) {
    console.warn(`Bone "${boneName}" not found in VRM humanoid`);
    return;
  }
  const r = THREE.MathUtils.clamp(rad, -LIM, LIM);
  if (axis === 'x') node.rotation.x = r;
  if (axis === 'y') node.rotation.y = r;
  if (axis === 'z') node.rotation.z = r;
}

// Motion DSL plan: { gestures:[{t, bone, action:'rotate'|'reset', axis, dir, amplitude, dur}], duration_hint }
export function applyMotionDSL(plan: any) {
  const vrm = (window as any).vrm;
  if (!vrm) {
    console.warn('No VRM loaded');
    return;
  }

  const start = performance.now() / 1000;
  const gestures = plan?.gestures || [];

  console.log('MotionDSL applied with', gestures.length, 'gestures');

  (window as any).__motionUpdate = (dt: number) => {
    const now = performance.now() / 1000 - start;

    for (const g of gestures) {
      const {
        t = 0,
        dur = 0.6,
        bone,
        action = 'rotate',
        axis = 'y',
        dir = 'left',
        amplitude = 0.3,
      } = g;

      if (now < t || now > t + dur) continue;

      const k = (now - t) / dur;
      const ease = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, k)));

      const sign =
        dir === 'left' || dir === 'up' || dir === 'forward'
          ? 1
          : dir === 'center'
          ? 0
          : -1;

      const rad = sign * amplitude * LIM * ease;

      // Map bone names to VRM humanoid bones
      const map: any = {
        Head: 'Head',
        Neck: 'Neck',
        Spine: 'Spine',
        Chest: 'Chest',
        LeftArm: 'LeftUpperArm',
        RightArm: 'RightUpperArm',
        LeftLeg: 'LeftUpperLeg',
        RightLeg: 'RightUpperLeg',
        Hips: 'Hips',
      };

      const target = map[bone] || bone;

      if (action === 'rotate') setBoneRot(vrm, target, axis, rad);
      if (action === 'reset') setBoneRot(vrm, target, axis, 0);
    }

    // Stop motion update after duration
    if (now > (plan.duration_hint || 2.0)) {
      console.log('MotionDSL complete');
      (window as any).__motionUpdate = null;
    }
  };
}

export function stopMotion() {
  (window as any).__motionUpdate = null;
  console.log('Motion stopped');
}
