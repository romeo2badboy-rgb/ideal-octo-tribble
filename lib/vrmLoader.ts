import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMUtils } from '@pixiv/three-vrm';

export async function loadVRM(path: string): Promise<VRM> {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        VRM.from(gltf)
          .then((vrm) => {
            console.log('VRM version:', vrm?.meta?.version);
            console.log('Humanoid bones:', Object.keys(vrm?.humanoid?.humanBones || {}));
            resolve(vrm);
          })
          .catch(reject);
      },
      undefined,
      reject
    );
  });
}
