'use client';

import dynamic from 'next/dynamic';

// Dynamically import components to avoid SSR issues with Three.js
const VRMViewer = dynamic(() => import('@/components/VRMViewer'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#212121',
        color: 'white',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚙️</div>
        <div style={{ fontSize: '20px', marginBottom: '10px' }}>Loading DAXON VRM System...</div>
        <div style={{ fontSize: '14px', color: '#888' }}>Initializing Three.js + VRM Loader</div>
      </div>
    </div>
  ),
});

const Controls = dynamic(() => import('@/components/Controls'), {
  ssr: false,
});

export default function Home() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* VRM 3D Viewer */}
      <VRMViewer modelPath="/models/AliciaSolid.vrm" />

      {/* Control Panel */}
      <Controls />

      {/* System Info Badge */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: '#4CAF50',
          padding: '12px 20px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          zIndex: 999,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🎮 DAXON VRM Body Control</div>
        <div style={{ fontSize: '11px', color: '#888' }}>
          Three.js 0.154.0 | VRM 2.0.7 | Gemini 2.5 Flash
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#aaa',
          padding: '10px 16px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '11px',
          zIndex: 999,
        }}
      >
        <div>Target FPS: 50 | Max Joint: ±45° | Smoothing: Lerp + S-curve</div>
        <div style={{ marginTop: '4px', color: '#4CAF50' }}>
          ✓ Per-bone lerp | ✓ Head limiter | ✓ Micro-variation
        </div>
      </div>
    </div>
  );
}
