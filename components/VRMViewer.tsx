'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { loadVRM } from '@/lib/vrmLoader';
import { startLoop, stopLoop } from '@/lib/loop';
import { enableIdle, disableIdle } from '@/lib/idle';
import { applyMotionDSL, stopMotion, resetAllBones } from '@/lib/motionDsl';

interface VRMViewerProps {
  modelPath: string;
}

export default function VRMViewer({ modelPath }: VRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<string>('Initializing...');

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('='.repeat(60));
    console.log('DAXON VRM BODY CONTROL - INITIALIZATION');
    console.log('='.repeat(60));

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;

    async function initialize() {
      try {
        // ========== SCENE SETUP ==========
        setLoadStatus('Creating 3D scene...');
        console.log('[Init] Creating scene...');

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x212121);

        // ========== CAMERA SETUP ==========
        console.log('[Init] Setting up camera...');
        camera = new THREE.PerspectiveCamera(
          30,
          window.innerWidth / window.innerHeight,
          0.1,
          100
        );
        camera.position.set(0, 1.4, 2.2);

        // ========== RENDERER SETUP ==========
        console.log('[Init] Creating renderer...');
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        if (containerRef.current) {
          containerRef.current.appendChild(renderer.domElement);
        }

        // ========== LIGHTING ==========
        console.log('[Init] Adding lights...');
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(1, 1, 1).normalize();
        scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        // ========== GRID HELPER ==========
        const gridHelper = new THREE.GridHelper(10, 10);
        scene.add(gridHelper);

        // ========== EXPOSE TO WINDOW FOR DEBUGGING ==========
        (window as any).renderer = renderer;
        (window as any).scene = scene;
        (window as any).camera = camera;

        console.log('[Init] ✓ Scene setup complete');

        // ========== LOAD VRM MODEL ==========
        setLoadStatus('Loading VRM model...');
        console.log('[Init] Loading VRM from:', modelPath);

        const vrm: VRM = await loadVRM(modelPath);

        // ========== ADD VRM TO SCENE ==========
        console.log('[Init] Adding VRM to scene...');
        scene.add(vrm.scene);

        // ========== FIX ORIENTATION - ROTATE TO FACE CAMERA ==========
        console.log('[Init] Fixing model orientation...');
        vrm.scene.position.set(0, 0, 0);
        vrm.scene.rotation.y = Math.PI; // Rotate 180° to face camera
        console.log('[Init] ✓ Model rotated to face camera');

        // ========== EXPOSE VRM TO WINDOW ==========
        (window as any).vrm = vrm;

        // ========== ENABLE IDLE ANIMATION ==========
        setLoadStatus('Starting idle animation...');
        console.log('[Init] Enabling idle animation...');
        const idleSuccess = enableIdle();

        if (!idleSuccess) {
          console.warn('[Init] ⚠ Idle animation failed to start');
        }

        // ========== START ANIMATION LOOP ==========
        setLoadStatus('Starting animation loop...');
        console.log('[Init] Starting animation loop...');
        startLoop(renderer, scene, camera);

        // ========== SANITY TEST: ROTATE HEAD ==========
        setTimeout(() => {
          console.log('[Init] Running sanity test...');
          const head = vrm?.humanoid?.getBoneNode('Head');
          if (head) {
            head.rotation.y += 0.2;
            console.log('[Init] ✓ Head rotation test successful');
          } else {
            console.warn('[Init] ⚠ Head bone not found for test');
          }
        }, 500);

        // ========== EXPOSE MOTION CONTROLS ==========
        console.log('[Init] Exposing motion controls to window...');

        (window as any).sendPlan = (plan: any) => {
          console.log('[User] sendPlan() called');
          return applyMotionDSL(plan);
        };

        (window as any).playMotion = (plan: any) => {
          console.log('[User] playMotion() called');
          return applyMotionDSL(plan);
        };

        (window as any).resetPose = () => {
          console.log('[User] resetPose() called');
          stopMotion();
          resetAllBones();
        };

        console.log('[Init] ✓ Motion controls exposed');
        console.log('[Init] Available functions: window.sendPlan(), window.playMotion(), window.resetPose()');

        // ========== INITIALIZATION COMPLETE ==========
        console.log('='.repeat(60));
        console.log('✓✓✓ INITIALIZATION COMPLETE ✓✓✓');
        console.log('='.repeat(60));
        console.log('VRM Version:', vrm?.meta?.version);
        console.log('Humanoid Bones:', Object.keys(vrm?.humanoid?.humanBones || {}).length);
        console.log('Animation Loop: RUNNING');
        console.log('Idle Animation: ACTIVE');
        console.log('='.repeat(60));

        setLoadStatus('Ready!');
        setIsLoading(false);
      } catch (err) {
        console.error('='.repeat(60));
        console.error('✗✗✗ INITIALIZATION FAILED ✗✗✗');
        console.error('='.repeat(60));
        console.error('[Init] Error:', err);

        setError(err instanceof Error ? err.message : 'Failed to initialize VRM viewer');
        setLoadStatus('Error!');
        setIsLoading(false);
      }
    }

    initialize();

    // ========== WINDOW RESIZE HANDLER ==========
    const handleResize = () => {
      if (!camera || !renderer) return;

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // ========== CLEANUP ==========
    return () => {
      console.log('[Cleanup] Cleaning up VRMViewer...');

      window.removeEventListener('resize', handleResize);

      stopLoop();
      disableIdle();
      stopMotion();

      if (renderer && containerRef.current) {
        try {
          containerRef.current.removeChild(renderer.domElement);
        } catch (e) {
          console.warn('[Cleanup] Error removing renderer DOM element:', e);
        }
        renderer.dispose();
      }

      // Clean up window references
      delete (window as any).vrm;
      delete (window as any).renderer;
      delete (window as any).scene;
      delete (window as any).camera;
      delete (window as any).sendPlan;
      delete (window as any).playMotion;
      delete (window as any).resetPose;

      console.log('[Cleanup] ✓ Cleanup complete');
    };
  }, [modelPath]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={containerRef} />

      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '30px',
            borderRadius: '10px',
            minWidth: '300px',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '15px' }}>
            {loadStatus}
          </div>
          <div
            style={{
              width: '100%',
              height: '4px',
              background: '#333',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#ff5252',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '30px',
            borderRadius: '10px',
            border: '2px solid #ff5252',
            maxWidth: '600px',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '15px' }}>✗</div>
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>
            Initialization Failed
          </div>
          <div style={{ fontSize: '14px', color: '#ffcdd2' }}>{error}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '15px' }}>
            Check console for details
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
