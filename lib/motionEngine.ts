import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import {
  MotionDSL,
  Gesture,
  Direction,
  Ease,
  Axis,
  SAFETY_CONSTRAINTS,
} from '@/types/motion';

export class MotionEngine {
  private vrm: VRM | null = null;
  private currentMotion: MotionDSL | null = null;
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private animationFrameId: number | null = null;

  constructor() {}

  setVRM(vrm: VRM) {
    this.vrm = vrm;
  }

  playMotion(motion: MotionDSL) {
    console.log('MotionEngine: Starting motion with', motion.gestures.length, 'gestures');
    this.currentMotion = motion;
    this.startTime = performance.now() / 1000;
    this.isPlaying = true;

    // Cancel any existing animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animate();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = () => {
    if (!this.isPlaying || !this.vrm || !this.currentMotion) {
      return;
    }

    const currentTime = performance.now() / 1000 - this.startTime;
    this.updateBones(currentTime);

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private updateBones(currentTime: number) {
    if (!this.vrm || !this.currentMotion) return;

    const gestures = this.currentMotion.gestures;
    let anyActive = false;

    for (const gesture of gestures) {
      const gestureEndTime = gesture.t + gesture.dur;

      // Check if gesture is active
      if (currentTime >= gesture.t && currentTime <= gestureEndTime) {
        const progress = (currentTime - gesture.t) / gesture.dur;
        const easedProgress = this.applyEasing(progress, gesture.ease);

        this.applyGesture(gesture, easedProgress);
        anyActive = true;
      }
    }

    // Stop animation if all gestures are complete
    if (currentTime >= (this.currentMotion.duration_hint || 2.0) && !anyActive) {
      console.log('MotionEngine: Motion complete');
      this.stop();
    }
  }

  private applyGesture(gesture: Gesture, progress: number) {
    if (!this.vrm) return;

    const bone = this.getBone(gesture.bone);
    if (!bone) {
      console.warn(`MotionEngine: Bone "${gesture.bone}" not found`);
      return;
    }

    const rotation = this.calculateRotation(gesture, progress);
    const clampedRotation = this.clampRotation(rotation);

    console.log(`Applying gesture to ${gesture.bone}: ${gesture.axis}=${clampedRotation.toFixed(2)} (progress: ${progress.toFixed(2)})`);

    switch (gesture.axis) {
      case 'x':
        bone.rotation.x = clampedRotation;
        break;
      case 'y':
        bone.rotation.y = clampedRotation;
        break;
      case 'z':
        bone.rotation.z = clampedRotation;
        break;
    }
  }

  private getBone(boneName: string): THREE.Object3D | null {
    if (!this.vrm) return null;

    const humanoid = this.vrm.humanoid;
    if (!humanoid) {
      console.warn('MotionEngine: VRM humanoid not found');
      return null;
    }

    // Map our bone names to VRM humanoid bones
    const boneMapping: Record<string, string> = {
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

    const vrmBoneName = boneMapping[boneName];
    if (!vrmBoneName) {
      console.warn(`MotionEngine: No mapping for bone "${boneName}"`);
      return null;
    }

    const boneNode = humanoid.humanBones[vrmBoneName as keyof typeof humanoid.humanBones];
    if (!boneNode) {
      console.warn(`MotionEngine: VRM bone "${vrmBoneName}" not found in humanoid.humanBones`);
    }
    return boneNode?.node || null;
  }

  private calculateRotation(gesture: Gesture, progress: number): number {
    const maxAngle = THREE.MathUtils.degToRad(SAFETY_CONSTRAINTS.MAX_JOINT_ANGLE_DEG);
    const amplitude = gesture.amplitude * maxAngle;

    // Direction multiplier
    let directionMultiplier = 1;
    switch (gesture.dir) {
      case 'left':
      case 'down':
      case 'back':
        directionMultiplier = -1;
        break;
      case 'center':
        // Return to center (0)
        return 0;
      case 'right':
      case 'up':
      case 'forward':
      default:
        directionMultiplier = 1;
        break;
    }

    // Oscillate or single movement based on action
    if (gesture.action === 'rotate') {
      return amplitude * directionMultiplier * progress;
    } else if (gesture.action === 'reset') {
      return 0;
    }

    return 0;
  }

  private clampRotation(rotation: number): number {
    const maxAngle = THREE.MathUtils.degToRad(SAFETY_CONSTRAINTS.MAX_JOINT_ANGLE_DEG);
    return THREE.MathUtils.clamp(rotation, -maxAngle, maxAngle);
  }

  private applyEasing(t: number, ease: Ease): number {
    switch (ease) {
      case 'in':
        return t * t;
      case 'out':
        return t * (2 - t);
      case 'inout':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t;
    }
  }

  reset() {
    if (!this.vrm) return;

    const humanoid = this.vrm.humanoid;
    if (!humanoid) return;

    // Reset all bones to default pose
    Object.values(humanoid.humanBones).forEach((bone) => {
      if (bone?.node) {
        bone.node.rotation.set(0, 0, 0);
      }
    });
  }
}
