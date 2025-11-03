'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { MotionDSL } from '@/types/motion';

// Dynamically import VRMViewer to avoid SSR issues with Three.js
const VRMViewer = dynamic(() => import('@/components/VRMViewer'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#212121',
      color: 'white'
    }}>
      Loading VRM Viewer...
    </div>
  ),
});

export default function Home() {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMotion, setLastMotion] = useState<MotionDSL | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/motion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: command.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate motion');
      }

      const motion: MotionDSL = await response.json();
      setLastMotion(motion);

      // Play motion via window object (set by VRMViewer)
      if ((window as any).playMotion) {
        (window as any).playMotion(motion);
      }

      setCommand('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if ((window as any).resetPose) {
      (window as any).resetPose();
    }
    setLastMotion(null);
  };

  const quickCommands = [
    'wave right hand',
    'wave left hand',
    'look left',
    'look right',
    'nod head',
    'shake head',
    'lean forward',
    'lean back',
    'raise both arms',
    'bow',
  ];

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <VRMViewer modelPath="/models/AliciaSolid.vrm" />

      {/* Control Panel */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '20px',
          borderRadius: '12px',
          minWidth: '600px',
          maxWidth: '90vw',
          backdropFilter: 'blur(10px)',
        }}
      >
        <h1
          style={{
            color: 'white',
            fontSize: '24px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          Daxon VRM Body Control Test
        </h1>

        <form onSubmit={handleSubmit} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter motion command (e.g., 'wave right hand')"
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '16px',
                borderRadius: '6px',
                border: '1px solid #444',
                background: '#2a2a2a',
                color: 'white',
              }}
            />
            <button
              type="submit"
              disabled={isProcessing || !command.trim()}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                borderRadius: '6px',
                border: 'none',
                background: isProcessing ? '#555' : '#4CAF50',
                color: 'white',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isProcessing ? 'Processing...' : 'Execute'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                borderRadius: '6px',
                border: 'none',
                background: '#f44336',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {error && (
          <div
            style={{
              padding: '12px',
              background: 'rgba(244, 67, 54, 0.2)',
              border: '1px solid #f44336',
              borderRadius: '6px',
              color: '#f44336',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* Quick Commands */}
        <div>
          <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px' }}>
            Quick Commands:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {quickCommands.map((cmd) => (
              <button
                key={cmd}
                onClick={() => setCommand(cmd)}
                disabled={isProcessing}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #555',
                  background: '#333',
                  color: 'white',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* Motion Display */}
        {lastMotion && (
          <details style={{ marginTop: '16px' }}>
            <summary
              style={{
                color: '#aaa',
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '8px',
              }}
            >
              Last Motion DSL (click to expand)
            </summary>
            <pre
              style={{
                background: '#1a1a1a',
                padding: '12px',
                borderRadius: '6px',
                color: '#4CAF50',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '200px',
              }}
            >
              {JSON.stringify(lastMotion, null, 2)}
            </pre>
          </details>
        )}
      </div>

      {/* Info Panel */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '16px',
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          maxWidth: '300px',
        }}
      >
        <h3 style={{ marginBottom: '8px', fontSize: '16px' }}>System Info</h3>
        <p style={{ marginBottom: '4px' }}>Model: Alicia Solid VRM</p>
        <p style={{ marginBottom: '4px' }}>Target FPS: 50</p>
        <p style={{ marginBottom: '4px' }}>Update Rate: 20ms</p>
        <p style={{ marginBottom: '4px' }}>Max Joint Angle: 45°</p>
        <p style={{ color: '#4CAF50', marginTop: '8px' }}>
          ✓ AI Motion Control Active
        </p>
      </div>
    </div>
  );
}
