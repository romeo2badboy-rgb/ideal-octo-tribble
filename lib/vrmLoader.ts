import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMUtils } from '@pixiv/three-vrm';

/**
 * Load VRM 0.x model with proper error handling
 * Disables expression manager to avoid conflicts
 */
export async function loadVRM(path: string): Promise<VRM> {
  console.log('[VRM Loader] Starting to load:', path);

  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        try {
          console.log('[VRM Loader] GLTF loaded, processing VRM...');

          // Clean up unnecessary joints (VRM 0.x optimization)
          VRMUtils.removeUnnecessaryJoints(gltf.scene);
          console.log('[VRM Loader] Unnecessary joints removed');

          // Convert GLTF to VRM (VRM 0.x API)
          VRM.from(gltf)
            .then((vrm) => {
              console.log('[VRM Loader] ✓ VRM created successfully');
              console.log('[VRM Loader] Version:', vrm?.meta?.version);
              console.log('[VRM Loader] Humanoid bones:', Object.keys(vrm?.humanoid?.humanBones || {}));

              // CRITICAL: Disable expression manager to prevent errors
              // We don't need expressions for body control
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
            })
            .catch((error) => {
              console.error('[VRM Loader] ERROR during VRM.from():', error);
              reject(error);
            });
        } catch (error) {
          console.error('[VRM Loader] ERROR during GLTF processing:', error);
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
