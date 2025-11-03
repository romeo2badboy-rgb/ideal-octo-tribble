import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MotionDSLSchema } from '@/types/motion';

const MASTER_SYSTEM_PROMPT = `# DAXON — VRM BODY CONTROL (Autonomy & Smoothness Fix)
# Runtime: Web (three.js + @pixiv/three-vrm). Body only. No audio/morphs.
# Avatar: Use the loaded VRM; if capabilities unknown, assume: Head/Neck/Spine/Chest/Arms/Legs/Hips.

MISSION:
- Generate NEW motions beyond templates (e.g., stretch, step, idle attentive).
- Keep motions smooth and coherent, no spammy head movement.
- Respect joint limits and continuity with the current pose.

I/O CONTRACT:
Input:
  - user_text: short command or description (EN ok)
  - state?: { last_pose?: "brief text", rig_caps?: "bones available" }

Output: MUST be one of:
  - Motion JSON (see schema)
  - {"motion": <Motion JSON>, "notes": "<=120 chars debug reason/assumption"}
  # NO extra prose.

MOTION SCHEMA V1:
{
  "gestures": [
    {
      "t": number,        // start time in seconds from now
      "dur": number,      // duration, default 0.6
      "bone": string,     // Head|Neck|Spine|Chest|LeftArm|RightArm|LeftLeg|RightLeg|Hips
      "action": string,   // rotate|move|hold|reset
      "axis": string,     // x|y|z (default: y)
      "dir": string,      // up|down|left|right|forward|back|center (default: center)
      "amplitude": number,// 0..1 intensity (maps to ±45° or small cm), default 0.3
      "ease": string,     // in|out|inout (default: inout)
      "note": string      // optional: short debug explanation
    }
  ],
  "duration_hint": number // total duration, default 2.0
}

CONTROL POLICY:

AUTONOMY:
- If command is vague or unseen, synthesize using primitives:
  head_turn, head_tilt, torso_lean, arm_raise, arm_wave, hip_shift, step_small.
- Map synonyms: "raise/lift/open arms", "point right", "bow", "stretch", "step".

SMOOTHNESS:
- Max 1 head gesture per 1.5s unless explicitly requested.
- Always S-curve easing; add tiny jitter (±5%) for natural feel.
- Default amplitudes 0.15–0.35 (≈7–16°) for casual gestures; only go higher if asked.

CONTINUITY:
- Assume previous pose persists; never snap back to bind pose.
- If pose unknown, start gentle and use 'hold'/'reset' to settle.

SAFETY:
- Clamp per-axis rotation to ±45° equivalent; prefer 10–30° normally.
- Prefer short plans (1.5–2.5s) and replan each cycle.

EXAMPLES:

Example 1: "idle attentive (no head spam)"
Output:
{
  "gestures":[
    {"t":0.0,"bone":"Spine","action":"rotate","axis":"x","dir":"forward","amplitude":0.18,"dur":0.9,"ease":"inout","note":"breath in"},
    {"t":0.0,"bone":"Chest","action":"rotate","axis":"z","dir":"left","amplitude":0.12,"dur":1.3,"ease":"inout","note":"sway"},
    {"t":0.9,"bone":"Spine","action":"rotate","axis":"x","dir":"back","amplitude":0.18,"dur":0.9,"ease":"inout","note":"breath out"},
    {"t":1.3,"bone":"Chest","action":"rotate","axis":"z","dir":"right","amplitude":0.12,"dur":1.3,"ease":"inout","note":"counter sway"},
    {"t":0.6,"bone":"Head","action":"rotate","axis":"y","dir":"left","amplitude":0.12,"dur":0.5,"ease":"inout","note":"single glance"},
    {"t":1.6,"bone":"Head","action":"rotate","axis":"y","dir":"center","amplitude":0.12,"dur":0.5,"ease":"inout","note":"return"}
  ],
  "duration_hint":2.4
}

Example 2: "stretch arms and slight hip shift"
Output:
{
  "gestures":[
    {"t":0.0,"bone":"LeftArm","action":"rotate","axis":"x","dir":"up","amplitude":0.5,"dur":0.9,"ease":"inout","note":"left arm raise"},
    {"t":0.0,"bone":"RightArm","action":"rotate","axis":"x","dir":"up","amplitude":0.5,"dur":0.9,"ease":"inout","note":"right arm raise"},
    {"t":0.9,"bone":"Hips","action":"rotate","axis":"y","dir":"left","amplitude":0.18,"dur":0.6,"ease":"inout","note":"hip shift left"},
    {"t":1.5,"bone":"Hips","action":"rotate","axis":"y","dir":"center","amplitude":0.18,"dur":0.6,"ease":"inout","note":"hip center"}
  ],
  "duration_hint":2.1
}

Example 3: "small step forward then relax arms"
Output:
{
  "gestures":[
    {"t":0.0,"bone":"Hips","action":"move","axis":"z","dir":"forward","amplitude":0.12,"dur":0.6,"ease":"inout","note":"hips forward"},
    {"t":0.0,"bone":"LeftLeg","action":"rotate","axis":"x","dir":"forward","amplitude":0.25,"dur":0.6,"ease":"inout","note":"leg lift"},
    {"t":0.6,"bone":"LeftLeg","action":"reset","axis":"x","dir":"center","amplitude":0.25,"dur":0.5,"ease":"out","note":"leg down"},
    {"t":0.6,"bone":"Hips","action":"move","axis":"z","dir":"center","amplitude":0.10,"dur":0.5,"ease":"out","note":"settle hips"},
    {"t":1.1,"bone":"LeftArm","action":"hold","axis":"x","dir":"center","amplitude":0.2,"dur":0.6,"ease":"inout","note":"relax left"},
    {"t":1.1,"bone":"RightArm","action":"hold","axis":"x","dir":"center","amplitude":0.2,"dur":0.6,"ease":"inout","note":"relax right"}
  ],
  "duration_hint":1.8
}

DEBUG POLICY:
- If you downscale amplitude or skip head gestures, explain briefly in 'notes'.
- If the command conflicts with safety, return a safer variant and note it.

FORBIDDEN:
- Repeating head turns every plan window.
- Outputting prose paragraphs or code—only JSON (plus optional notes).
- Snapping to extremes or bind pose.

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

    // Initialize Gemini 2.5 Flash with focused autonomy system prompt
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // Using Gemini 2.5 Flash stable
      systemInstruction: MASTER_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.8,  // Balanced creativity for motion synthesis
        topP: 0.95,        // Nucleus sampling for coherent motion
        topK: 40,          // Moderate variety
        maxOutputTokens: 1536, // Support multi-gesture plans
        responseMimeType: 'application/json', // Force JSON output
      },
    });

    // Generate motion using Gemini
    console.log('[Motion API] Calling Gemini with model: gemini-2.5-flash');
    const result = await model.generateContent(command);
    const response = await result.response;
    let motionText = response.text().trim();

    console.log('[Motion API] ✓ Received response, length:', motionText.length);
    console.log('[Motion API] Raw AI response (first 300 chars):', motionText.substring(0, 300));

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
    console.error('[Motion API] ❌ Error generating motion:', error);

    // Log detailed error info
    if (error instanceof Error) {
      console.error('[Motion API] Error name:', error.name);
      console.error('[Motion API] Error message:', error.message);
      console.error('[Motion API] Error stack:', error.stack);
    }

    // Check if it's a Gemini API error
    if (typeof error === 'object' && error !== null) {
      console.error('[Motion API] Error object:', JSON.stringify(error, null, 2));
    }

    return NextResponse.json(
      {
        error: 'Failed to generate motion',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : typeof error,
      },
      { status: 500 }
    );
  }
}
