'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { loadVRM } from '@/lib/vrmLoader';
import { startLoop, stopLoop } from '@/lib/loop';
import { enableIdle, disableIdle } from '@/lib/idle';
import { applyMotionDSL, stopMotion } from '@/lib/motionDsl';
import { MotionDSL } from '@/types/motion';

interface VRMViewerProps {
  modelPath: string;
}

export default function VRMViewer({ modelPath }: VRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x212121);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.4, 2.2);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Expose to window for debugging
    (window as any).renderer = renderer;
    (window as any).scene = scene;
    (window as any).camera = camera;

    // Load VRM
    loadVRM(modelPath)
      .then((vrm: VRM) => {
        (window as any).vrm = vrm;
        scene.add(vrm.scene);

        // Position and rotate model to face camera
        vrm.scene.position.set(0, 0, 0);
        vrm.scene.rotation.y = Math.PI; // Face camera

        console.log('✓ VRM loaded successfully');
        console.log('✓ VRM version:', vrm?.meta?.version);
        console.log('✓ Humanoid bones:', Object.keys(vrm?.humanoid?.humanBones || {}));

        // Enable idle animation
        enableIdle();

        // Start animation loop
        startLoop(renderer, scene, camera);

        // Quick sanity test: rotate head a bit after 500ms
        setTimeout(() => {
          const head = vrm?.humanoid?.getBoneNode('Head');
          if (head) {
            head.rotation.y += 0.2;
            console.log('✓ Head rotate test done');
          }
        }, 500);

        // Expose motion control to window
        (window as any).sendPlan = applyMotionDSL;
        (window as any).playMotion = applyMotionDSL;
        (window as any).resetPose = () => {
          stopMotion();
          // Reset all bones to neutral
          Object.keys(vrm?.humanoid?.humanBones || {}).forEach((boneName) => {
            const bone = vrm?.humanoid?.getBoneNode(boneName);
            if (bone) {
              bone.rotation.set(0, 0, 0);
            }
          });
          console.log('Pose reset');
        };

        console.log('✓ Motion controls exposed to window');

        setIsLoading(false);
      })
      .catch((err) => {
        console.error('✗ Error loading VRM:', err);
        setError('Failed to load VRM model');
        setIsLoading(false);
      });

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;

      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      stopLoop();
      disableIdle();
      stopMotion();

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      // Clean up window references
      delete (window as any).vrm;
      delete (window as any).renderer;
      delete (window as any).scene;
      delete (window as any).camera;
      delete (window as any).sendPlan;
      delete (window as any).playMotion;
      delete (window as any).resetPose;
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
            color: 'white',
            fontSize: '24px',
            fontFamily: 'monospace',
          }}
        >
          Loading VRM Model...
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'red',
            fontSize: '24px',
            fontFamily: 'monospace',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
