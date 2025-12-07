

import React, { useRef, useEffect, Suspense } from 'react';
import { useLoader, Canvas } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // Corrected import path
import { OrbitControls, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

interface Rock3DModelProps {
  modelUrl: string;
}

const Model: React.FC<Rock3DModelProps> = ({ modelUrl }) => {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const meshRef = useRef<THREE.Mesh>();

  // Optional: Adjust model scale or position if needed for generic models
  useEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Apply a generic rock-like material if the model doesn't have good one
          // This ensures a consistent look even with varied GLB sources
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#5A5A5A'), // Greyish rock color
            roughness: 0.8,
            metalness: 0.2,
            flatShading: true, // For a more faceted, crystal-like look
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      // Center the model and scale it
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(center); // Center the model

      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim; // Scale to fit within a 2-unit cube (arbitrary for good viewing)
      gltf.scene.scale.set(scale, scale, scale);
    }
  }, [gltf]);

  return <primitive object={gltf.scene} ref={meshRef} />;
};

export const Rock3DViewer: React.FC<Rock3DModelProps> = ({ modelUrl }) => {
  return (
    <div className={`w-full h-full relative`}>
      <Canvas 
        shadows 
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }} // Make canvas background transparent
      >
        {/* Added Suspense import */}
        <Suspense fallback={
          <Html center>
            <div className={`flex flex-col items-center gap-2`}>
              <div className={`w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin`} />
              <span className={`text-xs text-indigo-400`}>Loading 3D model...</span>
            </div>
          </Html>
        }>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} castShadow />
          <pointLight position={[-10, -10, -10]} />
          
          <Model modelUrl={modelUrl} />
          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            minPolarAngle={Math.PI / 3} // Prevent looking directly from below
            maxPolarAngle={Math.PI - Math.PI / 3} // Prevent looking directly from above
          />
          <Environment preset="night" background={false} /> {/* Futuristic night environment */}
        </Suspense>
      </Canvas>
      {/* Optional overlay for instructions */}
      <div className={`absolute top-2 right-2 text-xs text-gray-500 uppercase tracking-widest bg-black/50 backdrop-blur-sm px-2 py-1 rounded`}>
        Drag to Rotate
      </div>
    </div>
  );
};