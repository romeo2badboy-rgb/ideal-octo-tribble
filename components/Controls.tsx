'use client';

import { useState } from 'react';

/**
 * =======================================================================
 * DAXON CONTROL PANEL — Test Motion Plans & Diagnostics
 * =======================================================================
 */

export default function Controls() {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // Test motion plans
  const testPlans = {
    wave: {
      gestures: [
        {
          t: 0.0,
          bone: 'RightArm',
          action: 'rotate',
          axis: 'z',
          dir: 'left',
          amplitude: 0.55,
          dur: 0.7,
          ease: 'inout',
        },
        {
          t: 0.7,
          bone: 'RightArm',
          action: 'rotate',
          axis: 'z',
          dir: 'right',
          amplitude: 0.55,
          dur: 0.7,
          ease: 'inout',
        },
        {
          t: 1.4,
          bone: 'RightArm',
          action: 'reset',
          axis: 'z',
          dir: 'center',
          amplitude: 0.4,
          dur: 0.5,
          ease: 'out',
        },
      ],
      duration_hint: 2.0,
    },
    idle: {
      gestures: [
        {
          t: 0.0,
          bone: 'Spine',
          action: 'rotate',
          axis: 'x',
          dir: 'forward',
          amplitude: 0.18,
          dur: 0.9,
          ease: 'inout',
        },
        {
          t: 0.0,
          bone: 'Chest',
          action: 'rotate',
          axis: 'z',
          dir: 'left',
          amplitude: 0.12,
          dur: 1.3,
          ease: 'inout',
        },
        {
          t: 0.9,
          bone: 'Spine',
          action: 'rotate',
          axis: 'x',
          dir: 'back',
          amplitude: 0.18,
          dur: 0.9,
          ease: 'inout',
        },
        {
          t: 1.3,
          bone: 'Chest',
          action: 'rotate',
          axis: 'z',
          dir: 'right',
          amplitude: 0.12,
          dur: 1.3,
          ease: 'inout',
        },
        {
          t: 0.6,
          bone: 'Head',
          action: 'rotate',
          axis: 'y',
          dir: 'left',
          amplitude: 0.12,
          dur: 0.5,
          ease: 'inout',
        },
        {
          t: 1.6,
          bone: 'Head',
          action: 'rotate',
          axis: 'y',
          dir: 'center',
          amplitude: 0.12,
          dur: 0.5,
          ease: 'inout',
        },
      ],
      duration_hint: 2.4,
    },
    step: {
      gestures: [
        {
          t: 0.0,
          bone: 'Hips',
          action: 'move',
          axis: 'z',
          dir: 'forward',
          amplitude: 0.12,
          dur: 0.6,
          ease: 'inout',
        },
        {
          t: 0.0,
          bone: 'LeftLeg',
          action: 'rotate',
          axis: 'x',
          dir: 'forward',
          amplitude: 0.25,
          dur: 0.6,
          ease: 'inout',
        },
        {
          t: 0.6,
          bone: 'LeftLeg',
          action: 'reset',
          axis: 'x',
          dir: 'center',
          amplitude: 0.25,
          dur: 0.5,
          ease: 'out',
        },
        {
          t: 0.6,
          bone: 'Hips',
          action: 'move',
          axis: 'z',
          dir: 'center',
          amplitude: 0.10,
          dur: 0.5,
          ease: 'out',
        },
      ],
      duration_hint: 1.6,
    },
  };

  // Submit AI command
  const handleSubmit = async () => {
    if (!command.trim()) {
      setMessage({ type: 'error', text: 'Please enter a command' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/motion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate motion');
      }

      const motionPlan = await response.json();

      // Send to VRM
      if (typeof (window as any).sendPlan === 'function') {
        (window as any).sendPlan(motionPlan);
        setMessage({ type: 'success', text: `✓ Motion applied: ${command}` });
      } else {
        throw new Error('VRM not ready');
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to generate motion',
      });
    } finally {
      setLoading(false);
    }
  };

  // Play test plan
  const playTestPlan = (name: keyof typeof testPlans) => {
    try {
      const plan = testPlans[name];
      if (typeof (window as any).sendPlan === 'function') {
        (window as any).sendPlan(plan);
        setMessage({ type: 'success', text: `✓ Playing: ${name}` });
      } else {
        throw new Error('VRM not ready');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to play plan',
      });
    }
  };

  // Reset pose
  const resetPose = () => {
    try {
      if (typeof (window as any).resetPose === 'function') {
        (window as any).resetPose();
        setMessage({ type: 'success', text: '✓ Pose reset' });
      } else {
        throw new Error('VRM not ready');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset pose' });
    }
  };

  // Get diagnostics
  const showDiagnostics = () => {
    try {
      const vrm = (window as any).vrm;
      const motionDiag =
        typeof (window as any).__motionDiagnostics === 'function'
          ? (window as any).__motionDiagnostics()
          : null;
      const idleDiag =
        typeof (window as any).__idleDiagnostics === 'function'
          ? (window as any).__idleDiagnostics()
          : null;

      setDiagnostics({
        vrm: {
          loaded: !!vrm,
          version: vrm?.meta?.version || 'unknown',
          humanoidBones: Object.keys(vrm?.humanoid?.humanBones || {}).length || 0,
        },
        motion: motionDiag,
        idle: idleDiag,
        loop: {
          active: (window as any).__rafActive || false,
        },
      });

      setMessage({ type: 'success', text: '✓ Diagnostics retrieved' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to get diagnostics' });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxWidth: '400px',
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      }}
    >
      <h2 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#4CAF50' }}>
        🎮 DAXON Controls
      </h2>

      {/* AI Command Input */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>
          AI Motion Command:
        </label>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g., wave right hand"
          disabled={loading}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#222',
            color: 'white',
            border: '1px solid #444',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            marginTop: '8px',
            width: '100%',
            padding: '8px',
            backgroundColor: loading ? '#555' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}
        >
          {loading ? 'Generating...' : '▶ Generate Motion'}
        </button>
      </div>

      {/* Test Plans */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>
          Test Plans:
        </label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => playTestPlan('wave')}
            style={buttonStyle}
            title="Wave right hand"
          >
            👋 Wave
          </button>
          <button onClick={() => playTestPlan('idle')} style={buttonStyle} title="Idle attentive">
            💤 Idle
          </button>
          <button onClick={() => playTestPlan('step')} style={buttonStyle} title="Small step">
            🚶 Step
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Actions:</label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={resetPose} style={buttonStyle} title="Reset to neutral pose">
            🔄 Reset
          </button>
          <button onClick={showDiagnostics} style={buttonStyle} title="Show system diagnostics">
            📊 Diag
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: '8px',
            marginBottom: '10px',
            backgroundColor: message.type === 'success' ? '#2E7D32' : '#C62828',
            borderRadius: '5px',
            fontSize: '11px',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Diagnostics */}
      {diagnostics && (
        <div
          style={{
            padding: '10px',
            backgroundColor: '#111',
            borderRadius: '5px',
            fontSize: '10px',
            maxHeight: '300px',
            overflow: 'auto',
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px',
  backgroundColor: '#333',
  color: 'white',
  border: '1px solid #444',
  borderRadius: '5px',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: '11px',
  transition: 'background-color 0.2s',
};
