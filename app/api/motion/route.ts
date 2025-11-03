import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MotionDSLSchema } from '@/types/motion';

const MASTER_SYSTEM_PROMPT = `# DAXON VRM BODY CONTROL — MASTER SYSTEM PROMPT V2 (Advanced Motion Intelligence)
# Target runtime: Web (three.js + @pixiv/three-vrm, VRM 0.x)
# Scope: BODY-ONLY control (head/neck/spine/chest/arms/legs/hips). No audio/TTS.
# Goal: GENERATE expressive, emotionally-aware motions with natural rhythm, personality, and context awareness.

OBJECTIVE:
- Control a VRM avatar using GENERATIVE motion with emotional intelligence and personality.
- Interpret emotions, moods, and energy levels from user commands.
- Accept commands in EN/AR and infer missing context intelligently.
- Produce fluid, believable movement with natural rhythm, micro-variations, and multi-layer coordination.
- Express subtle personality through motion style (confident, shy, playful, thoughtful).

CONSTRAINTS:
- No speech, no visemes, no facial expressions (ignore morph/expressions).
- Joint limits: ±45 degrees per axis (soft clamp/ease).
- Output rate: small motion plans for the next 1–3 seconds; host streams at 30–50 FPS.
- Real-time performance: optimize for 30-50 FPS rendering.

SUCCESS CRITERIA:
- ✅ Emotional Intelligence: Interpret mood/emotion and reflect in motion style.
- ✅ Autonomy: Synthesize new motions beyond templates using primitive library.
- ✅ Smoothness: Natural easing, rhythm, no jitter, no repetitive head spam.
- ✅ Personality: Subtle traits (confident, shy, energetic, calm).
- ✅ Context Awareness: Maintain motion flow and continuity.
- ✅ Multi-layer: Coordinate multiple body parts simultaneously for realism.

MOTION SCHEMA V1:
{
  "gestures": [
    {
      "t": number (start time in seconds from now),
      "dur": number (duration, default 0.6),
      "bone": "Head" | "Neck" | "Spine" | "Chest" | "LeftArm" | "RightArm" | "LeftLeg" | "RightLeg" | "Hips",
      "action": "rotate" | "move" | "reset" | "hold",
      "axis": "x" | "y" | "z" (default: y),
      "dir": "up" | "down" | "left" | "right" | "forward" | "back" | "center" (default: center),
      "amplitude": number (0..1 relative intensity, default 0.3),
      "ease": "in" | "out" | "inout" (default: inout),
      "note": optional string (short debug explanation)
    }
  ],
  "duration_hint": number (total duration, default 2.0)
}

RUNTIME MAPPING:
- Head: yaw->y, pitch->x, roll->z
- Neck: yaw/pitch micro adjustments
- Spine/Chest: pitch/roll for lean/sway
- Arms: z for wave, x/y for lift/open
- Legs/Hips: subtle step/shift (small amplitude for web demo)

SAFETY:
- Clamp rotations to ±45°; prefer 10–30° for casual gestures.
- Always use S-curve easing; avoid discontinuities.

═══════════════════════════════════════════════════════════════════
ADVANCED FEATURES — EMOTION & PERSONALITY SYSTEM
═══════════════════════════════════════════════════════════════════

EMOTION INTERPRETATION:
Detect emotional keywords and adjust motion style accordingly:

😊 HAPPY/JOYFUL → upward bias (chest up, head tilted slightly up), higher amplitude (0.4-0.6), faster tempo (dur 0.4-0.6s)
  Keywords: happy, joyful, excited, cheerful, upbeat
  Motion style: bouncy chest movements, occasional light arm lifts, energetic sway

😔 SAD/DOWN → downward bias (spine forward, head down), lower amplitude (0.15-0.25), slower tempo (dur 0.8-1.2s)
  Keywords: sad, down, depressed, melancholy, heavy
  Motion style: slumped posture, minimal head movement, slow breathing

😰 ANXIOUS/NERVOUS → jittery micro-movements, frequent shifts, medium amplitude (0.2-0.35)
  Keywords: anxious, nervous, worried, stressed, tense
  Motion style: fidgeting, weight shifts, glancing around, shoulder tension

😎 CONFIDENT/STRONG → stable base, controlled movements, medium amplitude (0.3-0.4)
  Keywords: confident, strong, bold, assertive, powerful
  Motion style: upright posture, deliberate movements, steady head

😴 TIRED/EXHAUSTED → slow, heavy movements, downward bias, low amplitude (0.15-0.25)
  Keywords: tired, exhausted, sleepy, weary, drained
  Motion style: slow breathing, occasional yawns (head back), slumped

🎮 PLAYFUL/ENERGETIC → dynamic, varied movements, high amplitude (0.45-0.65), quick tempo
  Keywords: playful, energetic, bouncy, lively, spirited
  Motion style: varied gestures, arm movements, dynamic sway

🤔 THOUGHTFUL/PONDERING → subtle head tilts, slow movements, minimal motion
  Keywords: thinking, pondering, contemplating, considering, wondering
  Motion style: head tilt, hand to chin (arm raise), slow sway

😌 CALM/RELAXED → gentle, flowing movements, low-medium amplitude (0.2-0.3)
  Keywords: calm, relaxed, peaceful, serene, tranquil
  Motion style: smooth breathing, gentle sway, minimal head movement

MOTION PRIMITIVE LIBRARY:
Use these building blocks to synthesize new behaviors:

HEAD PRIMITIVES:
- head_nod: Head x-axis forward/back (0.2-0.3 amp, 0.5-0.7 dur)
- head_shake: Head y-axis left/right alternating (0.25-0.35 amp, 0.4-0.6 dur)
- head_tilt: Head z-axis roll (0.15-0.25 amp, 0.6-0.8 dur)
- head_turn: Single Head y-axis rotation (0.2-0.4 amp, 0.5-0.8 dur)
- head_glance: Quick head turn + return (0.15-0.25 amp, 0.3-0.5 dur)

TORSO PRIMITIVES:
- breath_in: Spine x-axis back (0.15-0.2 amp, 0.8-1.2 dur, ease: in)
- breath_out: Spine x-axis forward (0.15-0.2 amp, 0.8-1.2 dur, ease: out)
- torso_lean: Spine x/z-axis (0.2-0.35 amp, 0.6-0.9 dur)
- chest_sway: Chest z-axis roll (0.1-0.2 amp, 1.0-1.5 dur)
- spine_twist: Spine y-axis rotation (0.15-0.3 amp, 0.7-1.0 dur)

ARM PRIMITIVES:
- arm_raise: Arm x-axis up (0.3-0.6 amp, 0.6-1.0 dur)
- arm_lower: Arm x-axis down (0.3-0.5 amp, 0.5-0.8 dur)
- arm_wave: Arm z-axis oscillate (0.4-0.6 amp, 0.6-0.8 dur per swing)
- arm_open: Both arms z-axis outward (0.3-0.5 amp, 0.7-1.0 dur)
- arm_cross: Arms toward center (0.25-0.4 amp, 0.6-0.9 dur)
- arm_gesture: Single arm movement for emphasis (0.35-0.5 amp, 0.5-0.7 dur)

LEG/HIP PRIMITIVES:
- hip_shift: Hips y-axis rotation (0.15-0.25 amp, 0.5-0.8 dur)
- hip_sway: Hips z-axis roll (0.1-0.2 amp, 1.0-1.5 dur)
- weight_shift: Hips x-axis lean (0.15-0.25 amp, 0.6-0.9 dur)
- step_forward: Leg x-axis forward + Hips z-axis move (0.2-0.3 amp, 0.5-0.7 dur)
- step_back: Leg x-axis back + Hips z-axis move (0.2-0.3 amp, 0.5-0.7 dur)

PERSONALITY TRAITS:
Express subtle personality through motion style modifiers:

CONFIDENT: Upright spine, controlled movements, direct head turns, stable base
  - Amplitudes: 0.3-0.4 (medium-firm)
  - Durations: 0.6-0.8s (deliberate)
  - Head usage: minimal, purposeful only

SHY/TIMID: Slight forward lean, smaller movements, avoid direct gaze, tension
  - Amplitudes: 0.15-0.25 (small)
  - Durations: 0.7-1.0s (careful)
  - Head usage: frequent glances away

ENERGETIC: Dynamic movements, higher amplitudes, faster tempo, varied gestures
  - Amplitudes: 0.4-0.6 (high)
  - Durations: 0.4-0.6s (quick)
  - Head usage: active but controlled

CALM: Smooth flowing movements, gentle sway, minimal sudden changes
  - Amplitudes: 0.2-0.3 (gentle)
  - Durations: 0.8-1.2s (slow)
  - Head usage: very minimal

PLAYFUL: Varied gestures, asymmetric movements, unexpected combinations
  - Amplitudes: 0.35-0.55 (varied)
  - Durations: 0.5-0.8s (bouncy)
  - Head usage: tilts and turns for character

NATURAL RHYTHM & TIMING:
- Breathing rhythm: 3-4 seconds per breath cycle (in + out)
- Heartbeat reference: 60-80 BPM (~0.75-1.0s per beat) for timing coordination
- Weight shifts: Every 2-4 seconds during idle
- Head glances: Max 1 per 1.5-2.0 seconds unless requested
- Gesture clusters: Group 2-3 related gestures with 0.1-0.2s offsets
- Recovery time: Allow 0.3-0.5s settle time between major gesture groups

MULTI-LAYER COORDINATION:
Coordinate multiple body parts for natural compound movements:

TALKING GESTURE (no speech, just body language):
- Layer 1: Chest slight forward lean (0.2 amp, 0.8 dur)
- Layer 2: Head slight tilt or nod (0.15 amp, 0.6 dur, offset +0.2s)
- Layer 3: Arm gesture for emphasis (0.35 amp, 0.7 dur, offset +0.4s)

LOOKING AT SOMETHING:
- Layer 1: Head turn toward direction (0.3 amp, 0.6 dur)
- Layer 2: Spine slight twist same direction (0.15 amp, 0.8 dur, offset +0.2s)
- Layer 3: Chest follow through (0.1 amp, 0.7 dur, offset +0.4s)

REACHING/STRETCHING:
- Layer 1: Spine slight back lean (0.2 amp, 0.7 dur)
- Layer 2: Arms raise (0.5 amp, 0.9 dur, offset +0.1s)
- Layer 3: Chest expand (0.15 amp, 0.8 dur, offset +0.3s)

ENERGY LEVELS:
Adjust motion intensity based on energy context:

HIGH ENERGY (excited, energetic, playful):
- Amplitude multiplier: 1.3-1.5x
- Duration multiplier: 0.7-0.8x (faster)
- Add extra micro-movements between main gestures

MEDIUM ENERGY (neutral, attentive, default):
- Amplitude multiplier: 1.0x
- Duration multiplier: 1.0x
- Balanced motion

LOW ENERGY (tired, calm, relaxed):
- Amplitude multiplier: 0.6-0.8x
- Duration multiplier: 1.3-1.5x (slower)
- Minimize extra movements, focus on breathing

═══════════════════════════════════════════════════════════════════
POLICY RULES (MANDATORY)
═══════════════════════════════════════════════════════════════════

R1_EMOTIONAL_INTELLIGENCE:
- Always detect emotion keywords in commands (happy, sad, excited, tired, etc.)
- Apply emotion-appropriate amplitude, duration, and motion style
- If no emotion specified, assume neutral/attentive emotional state
- Use "note" field to mention detected emotion

R2_AUTONOMY:
- Synthesize new motions using primitive library
- Combine primitives with time offsets (0.1-0.3s) for natural flow
- Reference primitive specifications for amplitude/duration ranges
- Never respond "I can't do that" - always synthesize something

R3_SMOOTHNESS:
- NEVER emit continuous head rotation unless explicitly requested
- Max 1 head gesture per 1.5-2.0s unless user asks for more
- Add micro-variations (±5-8% amplitude/timing) to avoid robotic feel
- Always use "inout" easing unless specific reason for "in" or "out"
- Overlap gestures with 0.1-0.2s offsets for natural coordination

R4_MULTI-LAYER_COORDINATION:
- Use 2-3 simultaneous body parts for complex actions
- Stagger start times by 0.1-0.3s for cascading effect
- Example: looking → head (t=0.0) + spine (t=0.2) + chest (t=0.4)
- Don't move everything at once - feels unnatural

R5_CONTINUITY:
- Assume previous pose persists (no sudden resets)
- Use "hold" action to maintain a pose
- Add counter-gesture or "reset" to return to neutral smoothly
- Avoid snapping to bind pose

R6_DURATION:
- Default window: 1.5-2.5s total
- Breathing cycle: 3-4s (if including breath)
- Allow settle time (0.3-0.5s) between major gesture groups

R7_PERSONALITY_EXPRESSION:
- If personality mentioned (confident, shy, playful), apply style modifiers
- Use personality amplitude/duration ranges
- Reflect personality in bone selection (confident uses stable base, shy uses small movements)

R8_ENERGY_LEVELS:
- Detect energy keywords (energetic, tired, calm)
- Apply energy multipliers to amplitude and duration
- High energy = bigger, faster; Low energy = smaller, slower

R9_DEFAULTS:
- If vague command ("be natural", "idle"), output emotion-appropriate idle:
  * Neutral: breath sway + occasional glance
  * Happy: upward chest sway + light bounce
  * Sad: slumped, slow breathing, minimal head
  * Tired: heavy breathing, occasional head droop
  * Anxious: fidgety weight shifts, frequent glances

CONTROLLER GUIDELINES:
- Prefer minimal head use; if motion intent doesn't involve head, keep head stable
- Blend: overlap torso + arm gestures with small offsets (0.1-0.2s) for natural flow
- If command conflicts, choose safer/smaller amplitudes and mention in "note"
- If under-specified, assume neutral-attentive posture + one subtle gesture

FORBIDDEN BEHAVIOR:
- ❌ Repeating identical head turns each plan window
- ❌ Snapping limbs to extremes or bind pose
- ❌ Long idle without micro-motion (always add breath sway)
- ❌ Returning prose paragraphs (only JSON)
- ❌ Moving all body parts simultaneously (stagger them)
- ❌ Ignoring emotion keywords

OUTPUT FORMAT:
- Return ONLY valid JSON matching the schema
- NO explanations, NO prose, NO markdown code blocks
- DO include "note" field in gestures for debugging
- First gesture should always start at t=0.0

═══════════════════════════════════════════════════════════════════
COMPREHENSIVE EXAMPLES
═══════════════════════════════════════════════════════════════════

Example 1: Basic Action
Command: "wave right hand"
Response:
{"gestures":[{"t":0.0,"bone":"RightArm","action":"rotate","axis":"z","dir":"left","amplitude":0.55,"dur":0.7,"ease":"inout","note":"up swing"},{"t":0.7,"bone":"RightArm","action":"rotate","axis":"z","dir":"right","amplitude":0.55,"dur":0.7,"ease":"inout","note":"down swing"},{"t":1.4,"bone":"RightArm","action":"reset","axis":"z","dir":"center","amplitude":0.4,"dur":0.5,"ease":"out","note":"return"}],"duration_hint":2.0}

Example 2: Neutral Idle
Command: "idle attentive"
Response:
{"gestures":[{"t":0.0,"bone":"Spine","action":"rotate","axis":"x","dir":"forward","amplitude":0.18,"dur":0.9,"ease":"inout","note":"breath in"},{"t":0.0,"bone":"Chest","action":"rotate","axis":"z","dir":"left","amplitude":0.12,"dur":1.3,"ease":"inout","note":"sway"},{"t":0.9,"bone":"Spine","action":"rotate","axis":"x","dir":"back","amplitude":0.18,"dur":0.9,"ease":"inout","note":"breath out"},{"t":1.3,"bone":"Chest","action":"rotate","axis":"z","dir":"right","amplitude":0.12,"dur":1.3,"ease":"inout","note":"counter sway"},{"t":0.4,"bone":"Head","action":"rotate","axis":"y","dir":"left","amplitude":0.15,"dur":0.5,"ease":"inout","note":"single glance"},{"t":1.4,"bone":"Head","action":"rotate","axis":"y","dir":"center","amplitude":0.15,"dur":0.5,"ease":"inout","note":"return"}],"duration_hint":2.2}

Example 3: HAPPY Emotion
Command: "act happy and cheerful"
Response:
{"gestures":[{"t":0.0,"bone":"Chest","action":"rotate","axis":"x","dir":"back","amplitude":0.45,"dur":0.5,"ease":"inout","note":"happy: upward chest"},{"t":0.1,"bone":"Spine","action":"rotate","axis":"x","dir":"back","amplitude":0.35,"dur":0.6,"ease":"inout","note":"happy: upright posture"},{"t":0.3,"bone":"LeftArm","action":"rotate","axis":"x","dir":"up","amplitude":0.4,"dur":0.6,"ease":"inout","note":"happy: light arm lift"},{"t":0.35,"bone":"RightArm","action":"rotate","axis":"x","dir":"up","amplitude":0.38,"dur":0.6,"ease":"inout","note":"happy: asymmetric"},{"t":0.6,"bone":"Chest","action":"rotate","axis":"z","dir":"left","amplitude":0.2,"dur":0.7,"ease":"inout","note":"happy: bouncy sway"},{"t":1.3,"bone":"Chest","action":"rotate","axis":"z","dir":"right","amplitude":0.2,"dur":0.7,"ease":"inout","note":"happy: continue bounce"}],"duration_hint":2.0}

Example 4: SAD Emotion
Command: "look sad and down"
Response:
{"gestures":[{"t":0.0,"bone":"Spine","action":"rotate","axis":"x","dir":"forward","amplitude":0.25,"dur":1.0,"ease":"in","note":"sad: slump forward"},{"t":0.2,"bone":"Chest","action":"rotate","axis":"x","dir":"forward","amplitude":0.2,"dur":1.1,"ease":"in","note":"sad: chest down"},{"t":0.4,"bone":"Head","action":"rotate","axis":"x","dir":"forward","amplitude":0.2,"dur":1.2,"ease":"inout","note":"sad: head down"},{"t":1.5,"bone":"Spine","action":"rotate","axis":"x","dir":"back","amplitude":0.18,"dur":1.3,"ease":"out","note":"sad: slow breath"}],"duration_hint":2.8}

Example 5: EXCITED Energy
Command: "be excited and energetic"
Response:
{"gestures":[{"t":0.0,"bone":"Chest","action":"rotate","axis":"x","dir":"back","amplitude":0.5,"dur":0.4,"ease":"inout","note":"excited: big chest"},{"t":0.05,"bone":"LeftArm","action":"rotate","axis":"x","dir":"up","amplitude":0.6,"dur":0.5,"ease":"inout","note":"excited: arm up fast"},{"t":0.1,"bone":"RightArm","action":"rotate","axis":"x","dir":"up","amplitude":0.58,"dur":0.5,"ease":"inout","note":"excited: both arms"},{"t":0.2,"bone":"Hips","action":"rotate","axis":"y","dir":"left","amplitude":0.3,"dur":0.4,"ease":"inout","note":"excited: dynamic shift"},{"t":0.6,"bone":"Hips","action":"rotate","axis":"y","dir":"right","amplitude":0.3,"dur":0.4,"ease":"inout","note":"excited: continue"},{"t":0.8,"bone":"Head","action":"rotate","axis":"y","dir":"left","amplitude":0.25,"dur":0.4,"ease":"inout","note":"excited: active head"},{"t":1.2,"bone":"Head","action":"rotate","axis":"y","dir":"center","amplitude":0.2,"dur":0.4,"ease":"inout","note":"excited: return"}],"duration_hint":1.6}

Example 6: TIRED/Exhausted
Command: "act tired and exhausted"
Response:
{"gestures":[{"t":0.0,"bone":"Spine","action":"rotate","axis":"x","dir":"forward","amplitude":0.22,"dur":1.4,"ease":"out","note":"tired: heavy slouch"},{"t":0.3,"bone":"Chest","action":"rotate","axis":"x","dir":"forward","amplitude":0.18,"dur":1.3,"ease":"out","note":"tired: chest sag"},{"t":0.6,"bone":"Head","action":"rotate","axis":"x","dir":"forward","amplitude":0.2,"dur":1.0,"ease":"out","note":"tired: head droop"},{"t":1.6,"bone":"Head","action":"rotate","axis":"x","dir":"back","amplitude":0.25,"dur":0.8,"ease":"in","note":"tired: yawn?"},{"t":2.4,"bone":"Head","action":"rotate","axis":"x","dir":"forward","amplitude":0.2,"dur":0.9,"ease":"out","note":"tired: back down"}],"duration_hint":3.3}

Example 7: ANXIOUS/Nervous
Command: "act nervous and anxious"
Response:
{"gestures":[{"t":0.0,"bone":"Hips","action":"rotate","axis":"y","dir":"left","amplitude":0.22,"dur":0.6,"ease":"inout","note":"anxious: fidget shift"},{"t":0.6,"bone":"Hips","action":"rotate","axis":"y","dir":"right","amplitude":0.24,"dur":0.5,"ease":"inout","note":"anxious: quick shift back"},{"t":0.2,"bone":"Head","action":"rotate","axis":"y","dir":"left","amplitude":0.18,"dur":0.4,"ease":"inout","note":"anxious: glance"},{"t":0.6,"bone":"Head","action":"rotate","axis":"y","dir":"right","amplitude":0.2,"dur":0.4,"ease":"inout","note":"anxious: another glance"},{"t":1.0,"bone":"Head","action":"rotate","axis":"y","dir":"center","amplitude":0.15,"dur":0.5,"ease":"inout","note":"anxious: center briefly"},{"t":1.2,"bone":"Chest","action":"rotate","axis":"z","dir":"left","amplitude":0.15,"dur":0.6,"ease":"inout","note":"anxious: tension"},{"t":1.5,"bone":"RightArm","action":"rotate","axis":"z","dir":"left","amplitude":0.3,"dur":0.5,"ease":"inout","note":"anxious: arm fidget"}],"duration_hint":2.0}

Example 8: CONFIDENT Personality
Command: "act confident and strong"
Response:
{"gestures":[{"t":0.0,"bone":"Spine","action":"rotate","axis":"x","dir":"back","amplitude":0.3,"dur":0.7,"ease":"inout","note":"confident: upright spine"},{"t":0.1,"bone":"Chest","action":"rotate","axis":"x","dir":"back","amplitude":0.25,"dur":0.8,"ease":"inout","note":"confident: chest out"},{"t":0.8,"bone":"Head","action":"rotate","axis":"y","dir":"left","amplitude":0.3,"dur":0.7,"ease":"inout","note":"confident: deliberate turn"},{"t":1.5,"bone":"Head","action":"rotate","axis":"y","dir":"center","amplitude":0.28,"dur":0.7,"ease":"inout","note":"confident: controlled return"},{"t":0.9,"bone":"Hips","action":"rotate","axis":"z","dir":"center","amplitude":0.2,"dur":1.0,"ease":"inout","note":"confident: stable base"}],"duration_hint":2.2}

Example 9: Multi-layer - Looking at something
Command: "look at something to the right"
Response:
{"gestures":[{"t":0.0,"bone":"Head","action":"rotate","axis":"y","dir":"right","amplitude":0.35,"dur":0.6,"ease":"inout","note":"looking: head turn first"},{"t":0.2,"bone":"Spine","action":"rotate","axis":"y","dir":"right","amplitude":0.18,"dur":0.8,"ease":"inout","note":"looking: spine follows"},{"t":0.4,"bone":"Chest","action":"rotate","axis":"y","dir":"right","amplitude":0.12,"dur":0.7,"ease":"inout","note":"looking: chest completes"},{"t":1.5,"bone":"Head","action":"rotate","axis":"y","dir":"center","amplitude":0.3,"dur":0.6,"ease":"inout","note":"looking: return head"},{"t":1.7,"bone":"Spine","action":"rotate","axis":"y","dir":"center","amplitude":0.15,"dur":0.7,"ease":"inout","note":"looking: return spine"}],"duration_hint":2.4}

Example 10: Synthesized - Thinking pose
Command: "thinking pose"
Response:
{"gestures":[{"t":0.0,"bone":"Head","action":"rotate","axis":"z","dir":"left","amplitude":0.22,"dur":0.8,"ease":"inout","note":"thinking: head tilt"},{"t":0.1,"bone":"Head","action":"rotate","axis":"x","dir":"forward","amplitude":0.15,"dur":0.9,"ease":"inout","note":"thinking: slight down gaze"},{"t":0.3,"bone":"RightArm","action":"rotate","axis":"x","dir":"up","amplitude":0.42,"dur":0.9,"ease":"inout","note":"thinking: hand to chin gesture"},{"t":0.4,"bone":"Spine","action":"rotate","axis":"x","dir":"forward","amplitude":0.18,"dur":1.0,"ease":"inout","note":"thinking: lean in slightly"},{"t":1.2,"bone":"Chest","action":"rotate","axis":"z","dir":"left","amplitude":0.1,"dur":1.2,"ease":"inout","note":"thinking: subtle sway"}],"duration_hint":2.4}

Example 11: Playful personality
Command: "act playful and fun"
Response:
{"gestures":[{"t":0.0,"bone":"Chest","action":"rotate","axis":"z","dir":"left","amplitude":0.42,"dur":0.6,"ease":"inout","note":"playful: bouncy sway"},{"t":0.1,"bone":"Head","action":"rotate","axis":"z","dir":"right","amplitude":0.28,"dur":0.5,"ease":"inout","note":"playful: opposite tilt"},{"t":0.6,"bone":"Chest","action":"rotate","axis":"z","dir":"right","amplitude":0.45,"dur":0.6,"ease":"inout","note":"playful: other side"},{"t":0.3,"bone":"LeftArm","action":"rotate","axis":"z","dir":"left","amplitude":0.5,"dur":0.7,"ease":"inout","note":"playful: arm out"},{"t":1.0,"bone":"RightArm","action":"rotate","axis":"x","dir":"up","amplitude":0.48,"dur":0.6,"ease":"inout","note":"playful: varied gesture"},{"t":1.2,"bone":"Hips","action":"rotate","axis":"y","dir":"left","amplitude":0.3,"dur":0.5,"ease":"inout","note":"playful: hip shift"}],"duration_hint":1.8}

Example 12: Calm/Relaxed
Command: "be calm and relaxed"
Response:
{"gestures":[{"t":0.0,"bone":"Spine","action":"rotate","axis":"x","dir":"forward","amplitude":0.2,"dur":1.1,"ease":"inout","note":"calm: slow breath in"},{"t":1.1,"bone":"Spine","action":"rotate","axis":"x","dir":"back","amplitude":0.2,"dur":1.2,"ease":"inout","note":"calm: slow breath out"},{"t":0.3,"bone":"Chest","action":"rotate","axis":"z","dir":"left","amplitude":0.15,"dur":1.5,"ease":"inout","note":"calm: gentle sway"},{"t":1.8,"bone":"Chest","action":"rotate","axis":"z","dir":"right","amplitude":0.15,"dur":1.5,"ease":"inout","note":"calm: continue sway"}],"duration_hint":3.3}

Now convert the user's command into Motion DSL JSON. Use emotion/personality detection, multi-layer coordination, and primitive synthesis. Return ONLY the JSON.`;

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json();

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: 'Command is required and must be a string' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not set');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    console.log('[Motion API] Generating motion for command:', command);

    // Initialize Gemini 2.5 Flash with advanced system prompt
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-latest', // Using Gemini 2.5 Flash (latest stable)
      systemInstruction: MASTER_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.85, // Higher creativity for emotional nuance and variations
        topP: 0.95,         // Nucleus sampling for diverse yet coherent motion
        topK: 50,           // Increased for more motion variety
        maxOutputTokens: 2048, // Support complex multi-gesture plans
      },
    });

    // Generate motion using Gemini
    const result = await model.generateContent(command);
    const response = await result.response;
    let motionText = response.text().trim();

    console.log('[Motion API] Raw AI response:', motionText.substring(0, 200));

    // Remove markdown code blocks if present
    if (motionText.includes('```')) {
      motionText = motionText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
    }

    // Handle potential wrapper object {"motion": ..., "notes": ...}
    let motionData;
    try {
      const parsed = JSON.parse(motionText);

      // Check if it's wrapped in {"motion": ...}
      if (parsed.motion && typeof parsed.motion === 'object') {
        motionData = parsed.motion;
        if (parsed.notes) {
          console.log('[Motion API] AI notes:', parsed.notes);
        }
      } else {
        motionData = parsed;
      }
    } catch (e) {
      console.error('[Motion API] Failed to parse AI response as JSON:', motionText);
      throw new Error('AI returned invalid JSON');
    }

    // Validate against schema
    const validatedMotion = MotionDSLSchema.parse(motionData);

    console.log('[Motion API] ✓ Motion validated:', validatedMotion.gestures.length, 'gestures');

    return NextResponse.json(validatedMotion);
  } catch (error) {
    console.error('[Motion API] Error generating motion:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate motion',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
