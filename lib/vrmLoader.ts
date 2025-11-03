import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

/**
 * Load VRM 0.x model with proper error handling
 * Uses VRMLoaderPlugin for three-vrm 2.x
 */
export async function loadVRM(path: string): Promise<VRM> {
  console.log('[VRM Loader] Starting to load:', path);

  const loader = new GLTFLoader();

  // Register VRM loader plugin
  loader.register((parser) => {
    return new VRMLoaderPlugin(parser);
  });

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        try {
          console.log('[VRM Loader] GLTF loaded, processing VRM...');

          // VRM is stored in userData.vrm
          const vrm = gltf.userData.vrm as VRM;

          if (!vrm) {
            console.error('[VRM Loader] ERROR: No VRM data found in GLTF');
            reject(new Error('No VRM data in GLTF file'));
            return;
          }

          console.log('[VRM Loader] ✓ VRM extracted from GLTF');
          console.log('[VRM Loader] Version:', vrm?.meta?.version);
          console.log('[VRM Loader] Humanoid bones:', Object.keys(vrm?.humanoid?.humanBones || {}));

          // Clean up unnecessary joints (VRM 0.x optimization)
          VRMUtils.removeUnnecessaryJoints(gltf.scene);
          console.log('[VRM Loader] Unnecessary joints removed');

          // CRITICAL: Disable expression manager to prevent errors
          try {
            if (vrm && 'expressionManager' in vrm) {
              (vrm as any).expressionManager = undefined;
              console.log('[VRM Loader] Expression manager disabled');
            }
          } catch (e) {
            console.warn('[VRM Loader] Could not disable expression manager:', e);
          }

          // Verify humanoid exists
          if (!vrm.humanoid) {
            console.error('[VRM Loader] ERROR: No humanoid found in VRM!');
            reject(new Error('VRM has no humanoid'));
            return;
          }

          console.log('[VRM Loader] ✓ Load complete and validated');
          resolve(vrm);
        } catch (error) {
          console.error('[VRM Loader] ERROR during VRM processing:', error);
          reject(error);
        }
      },
      (progress) => {
        const percent = ((progress.loaded / progress.total) * 100).toFixed(0);
        console.log(`[VRM Loader] Loading progress: ${percent}%`);
      },
      (error) => {
        console.error('[VRM Loader] ERROR loading GLTF:', error);
        reject(error);
      }
    );
  });
}
