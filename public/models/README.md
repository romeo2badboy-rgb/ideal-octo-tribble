# VRM Model Setup

## Required Model

This project requires the **Alicia Solid.vrm** model.

### Where to Get the Model

1. Download from VRoid Hub or the official source
2. The recommended model is "Alicia Solid" - a high-quality VRM avatar

### Installation

1. Download `AliciaSolid.vrm` (or your preferred VRM model)
2. Place it in this directory: `/public/models/AliciaSolid.vrm`
3. Ensure the filename matches exactly: `AliciaSolid.vrm`

### Alternative Models

You can use any VRM 1.0 compatible model:

1. Place your `.vrm` file in this directory
2. Update the model path in `/app/page.tsx`:
   ```tsx
   <VRMViewer modelPath="/models/YourModel.vrm" />
   ```

### Model Requirements

- Format: VRM 1.0 (recommended) or VRM 0.x
- Recommended size: < 50MB for web deployment
- Must include humanoid bone structure
- Textures should be optimized for web

### Free VRM Models

You can find free VRM models at:
- VRoid Hub: https://hub.vroid.com/
- VRoid Studio: https://vroid.com/studio (create your own)
- Booth: https://booth.pm/ (search for VRM)

### Note

The `AliciaSolid.vrm` file is not included in this repository due to licensing.
You must obtain it separately.
