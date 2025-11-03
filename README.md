# Daxon VRM Body Control Test

Real-time AI-controlled VRM avatar with generative motion synthesis. No audio, no TTS, just pure motion control.

## Features

- **AI Motion Generation**: Convert text commands to precise bone animations
- **Real-time Control**: 30-50 FPS motion streaming
- **Safety First**: Joint angle limiting and smooth easing
- **Motion DSL**: JSON-based motion description language
- **VRM Support**: Full-body avatar control using VRM format
- **Vercel Ready**: Optimized for serverless deployment

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Add VRM Model

Download the Alicia Solid VRM model (or any VRM 1.0 model) and place it in:

```
/public/models/AliciaSolid.vrm
```

See `/public/models/README.md` for details.

### 3. Set Up Environment

Create a `.env.local` file:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

Get your API key from: https://console.anthropic.com/

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Usage

### Text Commands

Enter motion commands in the input field:

- `wave right hand`
- `look left`
- `nod head`
- `lean forward`
- `raise both arms`
- `bow`

The AI will convert your command into Motion DSL JSON and animate the avatar.

### Motion DSL

The system uses a JSON-based DSL for describing motions:

```json
{
  "gestures": [
    {
      "t": 0.0,
      "bone": "RightArm",
      "action": "rotate",
      "axis": "z",
      "amplitude": 0.6,
      "dir": "up",
      "dur": 0.8
    }
  ],
  "duration_hint": 1.6
}
```

## Architecture

```
┌─────────────┐
│   User UI   │ ← Text commands
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  API /motion    │ ← AI converts text to Motion DSL
│  (Claude API)   │
└──────┬──────────┘
       │
       ▼ Motion DSL JSON
┌─────────────────┐
│ Motion Engine   │ ← Interpolates & applies to bones
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  VRM Viewer     │ ← Three.js + @pixiv/three-vrm
│  (Three.js)     │
└─────────────────┘
```

## Project Structure

```
/
├── app/
│   ├── api/motion/         # AI motion generation API
│   ├── page.tsx            # Main UI
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── components/
│   └── VRMViewer.tsx       # Three.js VRM viewer
├── lib/
│   └── motionEngine.ts     # Motion interpolation engine
├── types/
│   └── motion.ts           # Motion DSL types & schemas
├── public/models/          # VRM model files
└── package.json
```

## Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/daxon-vrm-body-control)

### Manual Deploy

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `ANTHROPIC_API_KEY`

4. Upload VRM model to `/public/models/` before deploying, or use Vercel Blob storage for larger files.

## Configuration

### Motion Safety

Configured in `/types/motion.ts`:

```typescript
export const SAFETY_CONSTRAINTS = {
  MAX_JOINT_ANGLE_DEG: 45,
  MAX_AMPLITUDE: 1.0,
  MIN_DURATION: 0.1,
  MAX_DURATION: 5.0,
  FPS: 50,
  UPDATE_RATE: 0.02,
};
```

### Supported Bones

- Head, Neck, Spine, Chest
- LeftArm, RightArm
- LeftLeg, RightLeg
- Hips

### Motion Actions

- `rotate` - Rotate bone around axis
- `move` - Translate bone position
- `idle` - Hold current position
- `reset` - Return to default pose

## Performance

- Target FPS: 50
- Update Rate: 20ms (50Hz)
- Motion Latency: ~200ms (AI generation + streaming)
- Recommended Model Size: < 50MB

## Troubleshooting

### VRM Model Not Loading

- Check file path: `/public/models/AliciaSolid.vrm`
- Ensure VRM format version (VRM 1.0 preferred)
- Check browser console for errors

### AI Not Responding

- Verify `ANTHROPIC_API_KEY` is set
- Check API quota/limits
- Review browser network tab for errors

### Jerky Motion

- Reduce FPS in motion constraints
- Increase easing duration
- Check CPU usage (may need optimization)

## License

MIT

## Credits

- VRM Format: [VRM Consortium](https://vrm.dev/)
- Three.js VRM: [@pixiv/three-vrm](https://github.com/pixiv/three-vrm)
- AI: [Anthropic Claude](https://www.anthropic.com/)
