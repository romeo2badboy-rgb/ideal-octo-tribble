import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MotionDSLSchema } from '@/types/motion';

const SYSTEM_PROMPT = `You are a motion generation AI for VRM avatars. Your task is to convert text commands into Motion DSL JSON.

CRITICAL RULES:
- Output ONLY valid JSON matching the Motion DSL schema
- NO explanations, NO prose, NO markdown code blocks
- Keep rotations under 45° for safety
- Always use ease-in/ease-out for smooth movement
- Ensure bone names match exactly: Head, Neck, Spine, Chest, LeftArm, RightArm, LeftLeg, RightLeg, Hips

Motion DSL Schema:
{
  "gestures": [
    {
      "t": number (start time in seconds),
      "dur": number (duration, default 0.6),
      "bone": "Head" | "Neck" | "Spine" | "Chest" | "LeftArm" | "RightArm" | "LeftLeg" | "RightLeg" | "Hips",
      "action": "rotate" | "move" | "idle" | "reset",
      "axis": "x" | "y" | "z",
      "amplitude": number (0-1, default 0.3),
      "dir": "up" | "down" | "left" | "right" | "forward" | "back" | "center",
      "ease": "in" | "out" | "inout"
    }
  ],
  "duration_hint": number (total duration)
}

Examples:

Command: "wave right hand"
Response:
{"gestures":[{"t":0.0,"bone":"RightArm","action":"rotate","axis":"z","amplitude":0.6,"dir":"up","dur":0.4},{"t":0.4,"bone":"RightArm","action":"rotate","axis":"z","amplitude":0.6,"dir":"down","dur":0.4},{"t":0.8,"bone":"RightArm","action":"rotate","axis":"z","amplitude":0.6,"dir":"up","dur":0.4},{"t":1.2,"bone":"RightArm","action":"reset","axis":"z","amplitude":0,"dir":"center","dur":0.4}],"duration_hint":1.6}

Command: "look left"
Response:
{"gestures":[{"t":0.0,"bone":"Head","action":"rotate","axis":"y","dir":"left","amplitude":0.4,"dur":0.5},{"t":0.5,"bone":"Head","action":"rotate","axis":"y","dir":"center","amplitude":0.4,"dur":0.4}],"duration_hint":1.0}

Command: "nod head"
Response:
{"gestures":[{"t":0.0,"bone":"Head","action":"rotate","axis":"x","dir":"down","amplitude":0.3,"dur":0.4},{"t":0.4,"bone":"Head","action":"rotate","axis":"x","dir":"up","amplitude":0.3,"dur":0.4},{"t":0.8,"bone":"Head","action":"reset","axis":"x","amplitude":0,"dir":"center","dur":0.3}],"duration_hint":1.1}

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

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: SYSTEM_PROMPT,
    });

    // Generate motion using Gemini
    const result = await model.generateContent(command);
    const response = await result.response;
    const motionText = response.text().trim();

    // Remove markdown code blocks if present
    let cleanedText = motionText;
    if (motionText.includes('```')) {
      cleanedText = motionText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
    }

    // Parse and validate the motion DSL
    let motionData;
    try {
      motionData = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', cleanedText);
      throw new Error('AI returned invalid JSON');
    }

    // Validate against schema
    const validatedMotion = MotionDSLSchema.parse(motionData);

    return NextResponse.json(validatedMotion);
  } catch (error) {
    console.error('Error generating motion:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate motion',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
