import { z } from 'zod';

// Motion DSL v1 Schema
export const BoneEnum = z.enum([
  'Head',
  'Neck',
  'Spine',
  'Chest',
  'LeftArm',
  'RightArm',
  'LeftLeg',
  'RightLeg',
  'Hips',
]);

export const ActionEnum = z.enum(['rotate', 'move', 'idle', 'reset', 'hold']);

export const AxisEnum = z.enum(['x', 'y', 'z']);

export const DirectionEnum = z.enum([
  'up',
  'down',
  'left',
  'right',
  'forward',
  'back',
  'center',
]);

export const EaseEnum = z.enum(['in', 'out', 'inout']);

export const GestureSchema = z.object({
  t: z.number().describe('Start time in seconds'),
  dur: z.number().default(0.6).describe('Duration in seconds'),
  bone: BoneEnum,
  action: ActionEnum,
  axis: AxisEnum.default('y'),
  amplitude: z.number().min(0).max(1).default(0.3).describe('Intensity 0-1'),
  dir: DirectionEnum.default('forward'),
  ease: EaseEnum.default('inout'),
  note: z.string().optional().describe('Optional debug note'),
});

export const MotionDSLSchema = z.object({
  gestures: z.array(GestureSchema),
  duration_hint: z.number().default(2.0),
});

// TypeScript types
export type Bone = z.infer<typeof BoneEnum>;
export type Action = z.infer<typeof ActionEnum>;
export type Axis = z.infer<typeof AxisEnum>;
export type Direction = z.infer<typeof DirectionEnum>;
export type Ease = z.infer<typeof EaseEnum>;
export type Gesture = z.infer<typeof GestureSchema>;
export type MotionDSL = z.infer<typeof MotionDSLSchema>;

// VRM Bone mapping
export const VRM_BONE_MAPPING: Record<Bone, string[]> = {
  Head: ['Head.pitch', 'Head.yaw', 'Head.roll'],
  Neck: ['Neck.pitch', 'Neck.yaw'],
  Spine: ['Spine.pitch', 'Spine.yaw'],
  Chest: ['Chest.pitch', 'Chest.yaw'],
  LeftArm: ['LeftShoulder', 'LeftElbow'],
  RightArm: ['RightShoulder', 'RightElbow'],
  LeftLeg: ['LeftThigh', 'LeftKnee'],
  RightLeg: ['RightThigh', 'RightKnee'],
  Hips: ['Hips.yaw', 'Hips.pitch'],
};

// Safety constraints
export const SAFETY_CONSTRAINTS = {
  MAX_JOINT_ANGLE_DEG: 45,
  MAX_AMPLITUDE: 1.0,
  MIN_DURATION: 0.1,
  MAX_DURATION: 5.0,
  FPS: 50,
  UPDATE_RATE: 0.02,
} as const;
