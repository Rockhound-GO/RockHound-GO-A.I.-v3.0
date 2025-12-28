
import React, { useMemo, Suspense } from 'react';
import { useLoader, Canvas } from '@react-three/fiber';
import { PresentationControls, Environment, Center, Sparkles, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Rock } from '../types';

const Specimen: React.FC<{ modelUrl: string, rock?: Rock }> = ({ modelUrl, rock }) => {
  const gltf = useLoader(GLTFLoader, modelUrl);
  
  // 1. Load the realistic crystal texture for UV mapping
  const texture = useLoader(THREE.TextureLoader, 'https://aistudiocdn.com/assets/crystal-texture.jpg');

  // 2. Configure texture properties for seamless tiling
  useMemo(() => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2); // Tile the texture across the surface
    texture.anisotropy = 16; // Improve texture quality at sharp angles
    texture.needsUpdate = true;
  }, [texture]);

  const rockColor = useMemo(() => {
    if (!rock?.color?.length) return new THREE.Color('#ff00ff'); // Hotpink placeholder
    try {
      return new THREE.Color(rock.color[0].toLowerCase());
    } catch {
      return new THREE.Color('#ff00ff'); // Fallback to hotpink on error
    }
  }, [rock]);

  // 3. Upgrade the material to use the new texture maps
  const physicalMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    transmission: 0.7, // More transparent
    roughness: 0.1,    // More glass-like
    thickness: 2.0,    // Enhance refraction
    ior: 1.5,
    color: rockColor,
    envMapIntensity: 0.5,
    normalMap: texture, // Apply texture for surface detail (facets)
    normalScale: new THREE.Vector2(0.1, 0.1), // Control texture intensity
    transmissionMap: texture, // Use texture to vary transparency (internal structures)
  }), [rockColor, texture]);

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone();
    // Apply the new physical material to every mesh in the loaded model
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = physicalMaterial;
      }
    });
    return clonedScene;
  }, [gltf.scene, physicalMaterial]);

  return (
    <Center>
      <primitive object={scene} scale={3} />
    </Center>
  );
};

export const Rock3DViewer: React.FC<{ modelUrl: string; rock?: Rock }> = ({ modelUrl, rock }) => {
  const sparkleColor = useMemo(() => rock?.color?.[0] || '#ff00ff', [rock]);

  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 0, 5], fov: 40 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          
          <PresentationControls
            global
            snap
            speed={2}
            zoom={0.8}
            rotation={[0, 0, 0]}
            polar={[-Math.PI / 3, Math.PI / 3]}
            azimuth={[-Math.PI / 2, Math.PI / 2]}
          >
            <Specimen modelUrl={modelUrl} rock={rock} />
          </PresentationControls>
          
          <Environment preset="studio" />
          <ContactShadows opacity={0.5} scale={10} blur={2.5} far={4} />
          <Sparkles count={60} scale={6} size={1.2} speed={0.5} color={sparkleColor} />
        </Suspense>
      </Canvas>
      <div className="absolute top-6 left-6 flex flex-col gap-1 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-white/5 px-3 py-1 rounded-lg flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">
            PBR_PHYSICAL_RENDER
          </span>
        </div>
      </div>
    </div>
  );
};
