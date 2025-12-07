import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { useLoader, Canvas, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls, Environment, Html, Center, Float, ContactShadows, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, Hexagon, Maximize, ScanLine } from 'lucide-react';

interface Rock3DModelProps {
  modelUrl: string;
}

// -- ADVANCED SCANNER SHADER --
// Creates a sweeping laser effect over the geometry with wireframe overlay
const scannerVertexShader = `
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const scannerFragmentShader = `
  uniform float time;
  uniform vec3 color;
  uniform vec3 baseColor;
  
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vNormal;

  void main() {
    // 1. Scanning Laser Beam
    // Moves up and down based on time
    float scanHeight = sin(time * 2.0) * 1.5; 
    float beam = smoothstep(0.1, 0.0, abs(vPos.y - scanHeight));
    
    // 2. Tech Grid / Topography
    // Creates a contour line effect
    float grid = step(0.95, fract(vPos.y * 10.0)) * 0.5;
    
    // 3. Fresnel Edge Glow
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 3.0);

    // Compose
    vec3 finalColor = baseColor * 0.2; // Dim base
    finalColor += color * beam * 2.0; // Bright beam
    finalColor += color * grid * (0.2 + beam); // Grid lights up under beam
    finalColor += color * fresnel * 0.5; // Edge glow

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const Specimen: React.FC<{ modelUrl: string }> = ({ modelUrl }) => {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Analyze geometry to scale it perfectly to our "Containment Field"
  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone();
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.5 / maxDim; // Normalize to ~2.5 units
    clonedScene.scale.set(scale, scale, scale);
    return clonedScene;
  }, [gltf]);

  const shaderArgs = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color('#22d3ee') }, // Cyan-400
      baseColor: { value: new THREE.Color('#334155') }, // Slate-700
    },
    vertexShader: scannerVertexShader,
    fragmentShader: scannerFragmentShader,
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
    if (meshRef.current) {
        meshRef.current.rotation.y += 0.002; // Slow rotation
    }
  });

  // Apply the custom shader to all meshes in the model
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.ShaderMaterial({ ...shaderArgs, side: THREE.DoubleSide });
      }
    });
  }, [scene, shaderArgs]);

  return (
    <group ref={meshRef}>
      <primitive object={scene} />
      
      {/* Floating AR Labels attached to the 3D object */}
      <Html position={[1.2, 0.5, 0]} distanceFactor={10} zIndexRange={[100, 0]}>
        <div className="flex items-center gap-2 pointer-events-none">
            <div className="w-8 h-[1px] bg-cyan-500/50" />
            <div className="bg-black/60 backdrop-blur border border-cyan-500/30 px-2 py-1 rounded text-[8px] text-cyan-400 font-mono tracking-widest flex items-center gap-1 animate-pulse">
                <Activity size={8} /> LIVE_SCAN
            </div>
        </div>
      </Html>
      <Html position={[-1.2, -0.5, 0]} distanceFactor={10} zIndexRange={[100, 0]}>
        <div className="flex items-center gap-2 flex-row-reverse pointer-events-none">
            <div className="w-8 h-[1px] bg-indigo-500/50" />
            <div className="bg-black/60 backdrop-blur border border-indigo-500/30 px-2 py-1 rounded text-[8px] text-indigo-400 font-mono tracking-widest flex items-center gap-1">
                <Hexagon size={8} /> GEOMETRY
            </div>
        </div>
      </Html>
    </group>
  );
};

const ScannerRig: React.FC = () => {
    const ringRef1 = useRef<THREE.Group>(null);
    const ringRef2 = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (ringRef1.current) {
            ringRef1.current.rotation.x += delta * 0.2;
            ringRef1.current.rotation.y += delta * 0.1;
        }
        if (ringRef2.current) {
            ringRef2.current.rotation.x -= delta * 0.15;
            ringRef2.current.rotation.z += delta * 0.2;
        }
    });

    return (
        <>
            {/* Outer Containment Rings */}
            <group ref={ringRef1}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[2.2, 0.02, 16, 100]} />
                    <meshBasicMaterial color="#0ea5e9" transparent opacity={0.2} />
                </mesh>
            </group>
            <group ref={ringRef2}>
                <mesh rotation={[0, 0, Math.PI / 4]}>
                    <torusGeometry args={[2.5, 0.02, 16, 100]} />
                    <meshBasicMaterial color="#6366f1" transparent opacity={0.2} />
                </mesh>
            </group>
            
            {/* Data Particles */}
            <Sparkles count={30} scale={4} size={3} speed={0.4} opacity={0.5} color="#22d3ee" />
        </>
    );
}

export const Rock3DViewer: React.FC<Rock3DModelProps> = ({ modelUrl }) => {
  return (
    <div className="w-full h-full relative group">
        {/* Holographic Overlay Texture (CSS) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_2px,transparent_2px),linear-gradient(90deg,rgba(0,0,0,0)_2px,transparent_2px)] bg-[size:40px_40px] pointer-events-none opacity-20 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_150%)] pointer-events-none z-10" />

        <Canvas 
            shadows 
            dpr={[1, 2]} 
            camera={{ position: [0, 0, 6], fov: 45 }}
            gl={{ alpha: true, antialias: true }}
        >
            <Suspense fallback={
                <Html center>
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-t-2 border-cyan-500 rounded-full animate-spin" />
                            <div className="absolute inset-2 border-b-2 border-indigo-500 rounded-full animate-spin-reverse" />
                        </div>
                        <span className="text-[10px] font-mono text-cyan-500 animate-pulse">INITIALIZING VOXEL GRID...</span>
                    </div>
                </Html>
            }>
                {/* Lighting Setup for Drama */}
                <ambientLight intensity={0.2} />
                <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} color="#ffffff" castShadow />
                <pointLight position={[-10, -10, -5]} intensity={0.5} color="#4f46e5" />
                <pointLight position={[0, 5, 0]} intensity={0.8} color="#22d3ee" distance={10} />

                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <Center>
                        <Specimen modelUrl={modelUrl} />
                    </Center>
                </Float>

                <ScannerRig />
                
                <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} color="#000000" />
                
                <OrbitControls 
                    enableZoom={true} 
                    enablePan={false} 
                    minPolarAngle={Math.PI / 4} 
                    maxPolarAngle={Math.PI - Math.PI / 4}
                    minDistance={3}
                    maxDistance={8}
                    autoRotate
                    autoRotateSpeed={0.5}
                />
                
                <Environment preset="city" blur={1} />
            </Suspense>
        </Canvas>

        {/* HUD UI Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-20 pointer-events-none">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-cyan-500/80 text-[10px] font-mono">
                    <ScanLine size={12} className="animate-pulse" />
                    <span>OPTICAL_SENSOR_ACTIVE</span>
                </div>
                <div className="w-24 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent" />
            </div>
            
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-2 text-white/50 animate-pulse">
                <Maximize size={16} />
            </div>
        </div>
        
        {/* Interaction Hint */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[9px] text-gray-400 font-mono tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
            Drag to Rotate // Scroll to Zoom
        </div>
    </div>
  );
};