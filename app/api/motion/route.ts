import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MotionDSLSchema } from '@/types/motion';

const MASTER_SYSTEM_PROMPT = `# DAXON VRM BODY CONTROL — MASTER SYSTEM PROMPT (Motion Autonomy, Smoothness)
# Target runtime: Web (three.js + @pixiv/three-vrm, VRM 0.x)
# Scope: BODY-ONLY control (head/neck/spine/chest/arms/legs/hips). No audio/TTS.
# Goal: GENERATE new motions beyond fixed templates, with smooth, natural timing, and respect joint limits and continuity.

OBJECTIVE:
- Control a VRM avatar in real time using GENERATIVE motion (not preset picks).
- Accept short user commands (EN/AR okay) and also infer reasonable motions when under-specified.
- Produce fluid, believable movement with micro-variation and blending; avoid constant head bobbing.

CONSTRAINTS:
- No speech, no visemes, no facial expressions (ignore morph/expressions).
- Joint limits: ±45 degrees per axis (soft clamp/ease).
- Output rate: small motion plans for the next 1–3 seconds; host streams at 30–50 FPS.

SUCCESS CRITERIA:
- Autonomy: can synthesize motions NOT explicitly listed (e.g., "stretch arms", "take a step", "idle attentive").
- Smoothness: ease-in/out, no jitter, no repetitive head movement unless requested.
- Coherence: gestures match intent; maintain continuity from prior pose (no snaps).

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

POLICY RULES:
R1_autonomy:
- If user asks for something new (not in examples), synthesize with primitives:
  head_nod, head_turn, head_tilt, torso_lean, arm_raise, arm_wave, hip_shift, step_small.
- Combine primitives with offsets to form new behaviors.

R2_smoothness:
- Never emit continuous head rotation unless explicitly requested.
- Include at most 1 head gesture per 1.5s unless the user asks for more.
- Add tiny stochastic micro-variation (±5% amplitude/timing) to avoid robot feel.

R3_continuity:
- Assume previous pose persists. Avoid snapping to bind pose; use hold or small counter-gestures to settle.

R4_duration:
- Default plan window 1.5–2.5s; chain short plans rather than one long plan.

R5_defaults:
- If command is vague ("be natural"), output a calm attentive idle:
  slight torso breath sway + occasional gentle head turn; arms at comfortable rest (no T-pose).

CONTROLLER GUIDELINES:
- prefer minimal head use; if motion intent does not involve head, keep head stable.
- blend: overlap torso + arm gestures with small offsets (0.1–0.2s) to look natural.
- if command conflicts, choose safer/smaller amplitudes and mention in "notes".
- if under-specified, assume neutral-attentive posture and add one subtle gesture only.

FORBIDDEN BEHAVIOR:
- repeating identical head turns each plan window.
- snapping limbs to extremes or bind pose.
- long idle without micro-motion (add breath sway).
- returning prose paragraphs (only JSON).

OUTPUT FORMAT:
- Return ONLY valid JSON matching the schema above
- NO explanations, NO prose, NO markdown code blocks (unless inside "note" field)
- You may optionally include a "note" field in each gesture for debugging

EXAMPLES:

Command: "wave right hand"
Response:
{"gestures":[{"t":0.0,"bone":"RightArm","action":"rotate","axis":"z","dir":"left","amplitude":0.55,"dur":0.7,"ease":"inout","note":"up swing"},{"t":0.7,"bone":"RightArm","action":"rotate","axis":"z","dir":"right","amplitude":0.55,"dur":0.7,"ease":"inout","note":"down swing"},{"t":1.4,"bone":"RightArm","action":"reset","axis":"z","dir":"center","amplitude":0.4,"dur":0.5,"ease":"out","note":"return"}],"duration_hint":2.0}

Command: "idle attentive (no head spam)"
Response:
{"gestures":[{"t":0.0,"bone":"Spine","action":"rotate","axis":"x","dir":"forward","amplitude":0.18,"dur":0.9,"ease":"inout","note":"breath"},{"t":0.0,"bone":"Chest","action":"rotate","axis":"z","dir":"left","amplitude":0.12,"dur":1.3,"ease":"inout","note":"sway"},{"t":0.9,"bone":"Spine","action":"rotate","axis":"x","dir":"back","amplitude":0.18,"dur":0.9,"ease":"inout"},{"t":1.3,"bone":"Chest","action":"rotate","axis":"z","dir":"right","amplitude":0.12,"dur":1.3,"ease":"inout"},{"t":0.4,"bone":"Head","action":"rotate","axis":"y","dir":"left","amplitude":0.15,"dur":0.5,"ease":"inout","note":"single glance"},{"t":1.4,"bone":"Head","action":"rotate","axis":"y","dir":"center","amplitude":0.15,"dur":0.5,"ease":"inout"}],"duration_hint":2.2}

Command: "look around slowly"
Response:
{"gestures":[{"t":0.0,"bone":"Head","action":"rotate","axis":"y","dir":"left","amplitude":0.3,"dur":0.8},{"t":0.8,"bone":"Head","action":"rotate","axis":"y","dir":"right","amplitude":0.3,"dur":1.0},{"t":1.8,"bone":"Head","action":"rotate","axis":"y","dir":"center","amplitude":0.2,"dur":0.6}],"duration_hint":2.4}

Command: "stretch arms, small hip shift"
Response:
{"gestures":[{"t":0.0,"bone":"LeftArm","action":"rotate","axis":"x","dir":"up","amplitude":0.5,"dur":0.9},{"t":0.0,"bone":"RightArm","action":"rotate","axis":"x","dir":"up","amplitude":0.5,"dur":0.9},{"t":0.9,"bone":"Hips","action":"rotate","axis":"y","dir":"left","amplitude":0.2,"dur":0.6},{"t":1.5,"bone":"Hips","action":"rotate","axis":"y","dir":"center","amplitude":0.2,"dur":0.6}],"duration_hint":2.1}

Command: "take a small step forward"
Response:
{"gestures":[{"t":0.0,"bone":"Hips","action":"move","axis":"z","dir":"forward","amplitude":0.15,"dur":0.6},{"t":0.0,"bone":"LeftLeg","action":"rotate","axis":"x","dir":"forward","amplitude":0.25,"dur":0.6},{"t":0.6,"bone":"LeftLeg","action":"reset","axis":"x","dir":"center","amplitude":0.25,"dur":0.5},{"t":0.6,"bone":"Hips","action":"move","axis":"z","dir":"center","amplitude":0.12,"dur":0.5}],"duration_hint":1.3}

Now convert the user's command into Motion DSL JSON. Return ONLY the JSON.`;

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

    // Initialize Gemini AI with master system prompt
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: MASTER_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.8, // Allow some creativity for variations
        topP: 0.95,
        topK: 40,
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
