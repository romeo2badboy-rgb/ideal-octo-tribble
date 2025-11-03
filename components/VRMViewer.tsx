'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MotionEngine } from '@/lib/motionEngine';
import { MotionDSL } from '@/types/motion';

interface VRMViewerProps {
  modelPath: string;
  onMotionRequest?: (motion: MotionDSL) => void;
}

export default function VRMViewer({ modelPath, onMotionRequest }: VRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const motionEngineRef = useRef<MotionEngine | null>(null);
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
    camera.position.set(0, 1.4, 3);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Load VRM
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      modelPath,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        vrmRef.current = vrm;

        // Add VRM to scene
        scene.add(vrm.scene);

        // Position model
        vrm.scene.position.set(0, 0, 0);

        // Initialize motion engine
        const motionEngine = new MotionEngine();
        motionEngine.setVRM(vrm);
        motionEngineRef.current = motionEngine;

        setIsLoading(false);
        console.log('VRM loaded successfully');
      },
      (progress) => {
        console.log(
          'Loading:',
          (100 * progress.loaded) / progress.total + '%'
        );
      },
      (error) => {
        console.error('Error loading VRM:', error);
        setError('Failed to load VRM model');
        setIsLoading(false);
      }
    );

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();

      // Update VRM
      if (vrmRef.current) {
        vrmRef.current.update(deltaTime);
      }

      renderer.render(scene, camera);
    };
    animate();

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
      if (motionEngineRef.current) {
        motionEngineRef.current.stop();
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [modelPath]);

  const playMotion = (motion: MotionDSL) => {
    if (motionEngineRef.current) {
      motionEngineRef.current.playMotion(motion);
    }
  };

  const resetPose = () => {
    if (motionEngineRef.current) {
      motionEngineRef.current.reset();
    }
  };

  // Expose methods to parent
  useEffect(() => {
    if (onMotionRequest && motionEngineRef.current) {
      (window as any).playMotion = playMotion;
      (window as any).resetPose = resetPose;
    }
  }, [onMotionRequest]);

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
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
