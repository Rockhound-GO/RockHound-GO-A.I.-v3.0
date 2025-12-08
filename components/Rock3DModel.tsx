import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { useLoader, Canvas, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls, Environment, Html, Center, Float, ContactShadows, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, Hexagon, Maximize, ScanLine, Info, Zap, Layers, Droplets, Palette } from 'lucide-react';
import { Rock } from '../types';

interface Rock3DModelProps {
  modelUrl: string;
  rock?: Rock;
}

// -- ADVANCED SCANNER SHADER --
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
  uniform vec3 highlightPos;
  uniform float highlightStrength;
  
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vNormal;

  void main() {
    // 1. Scanning Laser Beam
    float scanHeight = sin(time * 2.0) * 1.5; 
    float beam = smoothstep(0.1, 0.0, abs(vPos.y - scanHeight));
    
    // 2. Tech Grid / Topography
    float grid = step(0.95, fract(vPos.y * 10.0)) * 0.5;
    
    // 3. Fresnel Edge Glow
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 3.0);

    // 4. Interactive Highlight (Hover Effect)
    float dist = distance(vPos, highlightPos);
    float highlight = smoothstep(0.6, 0.0, dist) * highlightStrength;

    // Compose
    vec3 finalColor = baseColor * 0.2; // Dim base
    finalColor += color * beam * 2.0; // Bright beam
    finalColor += color * grid * (0.2 + beam); // Grid lights up under beam
    finalColor += color * fresnel * 0.5; // Edge glow
    
    // Add Highlight Burst
    finalColor += vec3(1.0, 0.9, 0.5) * highlight * 3.0; // Amber/White hot glow

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const Hotspot: React.FC<{ 
    position: [number, number, number], 
    data: { label: string, value: string, icon: any }, 
    onHover: (pos: THREE.Vector3) => void,
    onOut: () => void
}> = ({ position, data, onHover, onOut }) => {
    const [hovered, setHovered] = useState(false);
    const ref = useRef<THREE.Group>(null);

    return (
        <group position={position} ref={ref}>
            {/* Interactive Trigger */}
            <mesh 
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    onHover(new THREE.Vector3(...position));
                }} 
                onPointerOut={() => {
                    setHovered(false);
                    onOut();
                }}
            >
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshBasicMaterial color={hovered ? "#fbbf24" : "#ffffff"} transparent opacity={0.0} depthTest={false} />
            </mesh>
            
            {/* Visual Anchor Dot */}
            <mesh scale={hovered ? 1.5 : 1}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshBasicMaterial color={hovered ? "#fbbf24" : "#22d3ee"} toneMapped={false} />
            </mesh>
            
            {/* Pulsing Ring */}
            {!hovered && (
                <mesh scale={1.2}>
                    <ringGeometry args={[0.06, 0.07, 32]} />
                    <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
                </mesh>
            )}

            {/* UI Label */}
            <Html distanceFactor={8} zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                <div className={`transition-all duration-500 ease-out ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                     {/* Connecting Line Animation */}
                     <div className={`absolute bottom-0 left-1/2 w-px bg-gradient-to-t from-transparent via-cyan-500 to-cyan-400 transition-all duration-500 ${hovered ? 'h-8' : 'h-0'}`} style={{ transform: 'translateX(-50%) translateY(100%)' }} />
                     
                     <div className="bg-[#050a10]/90 backdrop-blur-xl border border-cyan-500/30 p-3 rounded-tr-xl rounded-bl-xl rounded-tl-sm rounded-br-sm shadow-[0_0_30px_rgba(6,182,212,0.2)] min-w-[140px] relative overflow-hidden group mb-8">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-50" />
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                        
                        <div className="relative z-10 flex items-center gap-3 mb-1.5">
                            <div className="p-1.5 rounded bg-cyan-900/30 border border-cyan-500/30">
                                <data.icon size={12} className="text-cyan-400" />
                            </div>
                            <span className="text-[10px] font-bold text-cyan-100 tracking-[0.2em]">{data.label}</span>
                        </div>
                        <div className="relative z-10 text-xs font-mono text-cyan-300 pl-1 border-l-2 border-cyan-500/50">
                            {data.value}
                        </div>
                     </div>
                </div>
            </Html>
        </group>
    );
};

const Specimen: React.FC<{ modelUrl: string, rock?: Rock }> = ({ modelUrl, rock }) => {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [highlightPos, setHighlightPos] = useState(new THREE.Vector3(0, 0, 0));
  const [highlightStrength, setHighlightStrength] = useState(0);
  const [isHoveringHotspot, setIsHoveringHotspot] = useState(false);

  // Analyze geometry to scale it perfectly
  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone();
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.5 / maxDim; 
    clonedScene.scale.set(scale, scale, scale);
    return clonedScene;
  }, [gltf]);

  const shaderArgs = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color('#22d3ee') },
      baseColor: { value: new THREE.Color('#334155') },
      highlightPos: { value: new THREE.Vector3(0, 0, 0) },
      highlightStrength: { value: 0.0 }
    },
    vertexShader: scannerVertexShader,
    fragmentShader: scannerFragmentShader,
  }), []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      // Smoothly animate highlight strength
      materialRef.current.uniforms.highlightStrength.value = THREE.MathUtils.lerp(
          materialRef.current.uniforms.highlightStrength.value,
          highlightStrength,
          delta * 8
      );
      materialRef.current.uniforms.highlightPos.value.lerp(highlightPos, delta * 10);
    }
    
    if (meshRef.current && !isHoveringHotspot) {
        meshRef.current.rotation.y += 0.002;
    }
  });

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.ShaderMaterial({ ...shaderArgs, side: THREE.DoubleSide });
        materialRef.current = child.material;
      }
    });
  }, [scene, shaderArgs]);

  // Generate dynamic annotations based on rock properties
  const annotations = useMemo(() => {
      if (!rock) return [];
      
      // Seed PRNG with rock ID for consistent hotspot positions per rock
      const seedString = rock.id || rock.name || 'seed';
      let seed = 0;
      for (let i = 0; i < seedString.length; i++) seed += seedString.charCodeAt(i);
      
      const rng = () => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
      };

      const getPos = (): [number, number, number] => {
          // Distribute randomly on a spherical shell approx matching the model size
          const u = rng();
          const v = rng();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          const r = 1.1 + rng() * 0.4; // Vary radius
          return [
              r * Math.sin(phi) * Math.cos(theta),
              r * Math.sin(phi) * Math.sin(theta),
              r * Math.cos(phi)
          ];
      };

      const list = [
          { pos: getPos(), data: { label: 'HARDNESS', value: `${rock.hardness} / 10`, icon: Layers } },
          { pos: getPos(), data: { label: 'CLASS', value: rock.type, icon: Hexagon } },
          { pos: getPos(), data: { label: 'RARITY', value: `${rock.rarityScore}%`, icon: Zap } }
      ];

      if (rock.composition && rock.composition.length > 0) {
           list.push({
              pos: getPos(), 
              data: { label: 'COMPOSITION', value: rock.composition[0], icon: Droplets } 
           });
      }

      if (rock.color && rock.color.length > 0) {
           list.push({
              pos: getPos(), 
              data: { label: 'PIGMENT', value: rock.color[0], icon: Palette } 
           });
      }

      return list;
  }, [rock]);

  return (
    <group ref={meshRef}>
      <primitive object={scene} />
      
      {annotations.map((ann, i) => (
          <Hotspot 
            key={i}
            position={ann.pos}
            data={ann.data}
            onHover={(pos) => {
                setIsHoveringHotspot(true);
                setHighlightPos(pos);
                setHighlightStrength(1.0);
            }}
            onOut={() => {
                setIsHoveringHotspot(false);
                setHighlightStrength(0.0);
            }}
          />
      ))}
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
            <Sparkles count={30} scale={4} size={3} speed={0.4} opacity={0.5} color="#22d3ee" />
        </>
    );
}

export const Rock3DViewer: React.FC<Rock3DModelProps> = ({ modelUrl, rock }) => {
  return (
    <div className="w-full h-full relative group">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_2px,transparent_2px),linear-gradient(90deg,rgba(0,0,0,0)_2px,transparent_2px)] bg-[size:40px_40px] pointer-events-none opacity-20 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_150%)] pointer-events-none z-10" />

        <Canvas 
            shadows 
            dpr={[1, 2]} 
            camera={{ position: [0, 0, 6], fov: 45 }}
            gl={{ alpha: true, antialias: true }}
        >
            <Suspense fallback={null}>
                <ambientLight intensity={0.2} />
                <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} color="#ffffff" castShadow />
                <pointLight position={[-10, -10, -5]} intensity={0.5} color="#4f46e5" />
                <pointLight position={[0, 5, 0]} intensity={0.8} color="#22d3ee" distance={10} />

                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <Center>
                        <Specimen modelUrl={modelUrl} rock={rock} />
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
                    autoRotate={false}
                />
                
                <Environment preset="city" blur={1} />
            </Suspense>
        </Canvas>

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
        
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[9px] text-gray-400 font-mono tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
            Hover Points to Analyze
        </div>
    </div>
  );
};

export default Rock3DViewer;