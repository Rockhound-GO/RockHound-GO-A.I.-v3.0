
// Removed redundant @react-three/fiber reference to fix type resolution error.
import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { useLoader, Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Center, Float, ContactShadows, Sparkles, Sphere } from '@react-three/drei';
import * as THREE from 'three';
/* Fix: Added missing import for GLTFLoader */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Activity, Hexagon, Maximize, ScanLine, Info, Zap, Layers, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { Rock } from '../types';

interface Rock3DModelProps {
  modelUrl: string;
  rock?: Rock;
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
    // Lights up the mesh surface near the highlighted feature
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
                onPointerOver={(e: any) => {
                    e.stopPropagation();
                    setHovered(true);
                    onHover(new THREE.Vector3(...position));
                }} 
                onPointerOut={() => {
                    setHovered(false);
                    onOut();
                }}
            >
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color={hovered ? "#fbbf24" : "#ffffff"} transparent opacity={0.2} depthTest={false} />
            </mesh>
            
            {/* Visual Dot */}
            <mesh scale={hovered ? [1.5, 1.5, 1.5] : [1, 1, 1]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color={hovered ? "#fbbf24" : "#22d3ee"} />
            </mesh>

            {/* Connecting Line to Surface (Visual only) */}
            <mesh position={[0, -0.25, 0]} rotation={[0, 0, 0]}>
                 <cylinderGeometry args={[0.005, 0.005, 0.5]} />
                 <meshBasicMaterial color={hovered ? "#fbbf24" : "#22d3ee"} transparent opacity={0.3} />
            </mesh>

            {/* UI Label */}
            <Html distanceFactor={8} zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                <div className={`transition-all duration-300 ${hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} -translate-x-1/2 -translate-y-full mb-4`}>
                    <div className="bg-black/80 backdrop-blur-md border border-amber-500/50 p-3 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.3)] min-w-[120px]">
                        <div className="flex items-center gap-2 mb-1 border-b border-white/10 pb-1">
                            <data.icon size={12} className="text-amber-400" />
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">{data.label}</span>
                        </div>
                        <div className="text-xs font-mono text-white whitespace-nowrap">
                            {data.value}
                        </div>
                        {/* Decorative connector */}
                        <div className="absolute left-1/2 bottom-0 w-px h-4 bg-amber-500/50 translate-y-full -translate-x-1/2" />
                    </div>
                </div>
            </Html>
        </group>
    );
};

interface SpecimenProps {
    modelUrl: string;
    rock?: Rock;
    setIsHoveringHotspot: React.Dispatch<React.SetStateAction<boolean>>;
}

const Specimen: React.FC<SpecimenProps> = ({ modelUrl, rock, setIsHoveringHotspot }) => {
  /* Fix: Correctly provided GLTFLoader to useLoader after importing it */
  const gltf = useLoader(GLTFLoader, modelUrl);
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [highlightPos, setHighlightPos] = useState(new THREE.Vector3(0, 0, 0));
  const [highlightStrength, setHighlightStrength] = useState(0);
  const [isHoveringLocalHotspot, setIsHoveringLocalHotspot] = useState(false);

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

  // Determine color based on rock data
  const rockColor = useMemo(() => {
    if (!rock || !rock.color || rock.color.length === 0) return new THREE.Color('#22d3ee');
    try {
        // Try to parse the first color string
        return new THREE.Color(rock.color[0].toLowerCase());
    } catch {
        return new THREE.Color('#22d3ee');
    }
  }, [rock]);

  const shaderArgs = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
      color: { value: rockColor }, 
      baseColor: { value: new THREE.Color('#334155') }, // Slate-700
      highlightPos: { value: new THREE.Vector3(0, 0, 0) },
      highlightStrength: { value: 0.0 }
    },
    vertexShader: scannerVertexShader,
    fragmentShader: scannerFragmentShader,
  }), [rockColor]);

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
    
    // Auto-rotate only when not inspecting a detail
    if (meshRef.current && !isHoveringLocalHotspot) {
        meshRef.current.rotation.y += 0.002;
    }
  });

  // Apply the custom shader to all meshes in the model
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.ShaderMaterial({ ...shaderArgs, side: THREE.DoubleSide });
        materialRef.current = child.material;
      }
    });
  }, [scene, shaderArgs]);

  // Define Annotations based on rock data
  const annotations = useMemo(() => {
      if (!rock) return [];
      return [
          { 
              pos: [0.6, 0.8, 0.6] as [number, number, number], 
              data: { label: 'HARDNESS', value: `${rock.hardness} / 10 (Mohs)`, icon: Layers } 
          },
          { 
              pos: [-0.7, 0.2, 0.5] as [number, number, number], 
              data: { label: 'CLASS', value: rock.type, icon: Hexagon } 
          },
          { 
              pos: [0.2, -0.8, 0.7] as [number, number, number], 
              data: { label: 'RARITY', value: `${rock.rarityScore}% PURITY`, icon: Zap } 
          }
      ];
  }, [rock]);

  return (
    <group ref={meshRef}>
      <primitive object={scene} />
      
      {/* Interactive Data Points attached to the mesh group so they rotate with it */}
      {annotations.map((ann, i) => (
          <Hotspot 
            key={i}
            position={ann.pos}
            data={ann.data}
            onHover={(pos) => {
                setIsHoveringLocalHotspot(true);
                setIsHoveringHotspot(true); // Notify parent
                setHighlightPos(pos); // Set highlight target to hotspot position
                setHighlightStrength(1.0);
            }}
            onOut={() => {
                setIsHoveringLocalHotspot(false);
                setIsHoveringHotspot(false); // Notify parent
                setHighlightStrength(0.0);
            }}
          />
      ))}
    </group>
  );
};

const ScannerRig: React.FC<{ color?: string }> = ({ color = "#0ea5e9" }) => {
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
                    <meshBasicMaterial color={color} transparent opacity={0.2} />
                </mesh>
            </group>
            <group ref={ringRef2}>
                <mesh rotation={[0, 0, Math.PI / 4]}>
                    <torusGeometry args={[2.5, 0.02, 16, 100]} />
                    <meshBasicMaterial color={color} transparent opacity={0.2} />
                </mesh>
            </group>
            
            {/* Data Particles */}
            <Sparkles count={30} scale={4} size={3} speed={0.4} opacity={0.5} color={color} />
        </>
    );
}

// --- CONTROLS COMPONENT ---
// Handles camera manipulation and UI
const ControlButton = ({ onClick, icon, label, active = false }: { onClick: () => void, icon: React.ReactNode, label: string, active?: boolean }) => (
    <button 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`p-2 rounded-lg backdrop-blur-md border transition-all duration-200 group relative flex items-center justify-center
            ${active 
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                : 'bg-black/60 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
        title={label}
    >
        {icon}
    </button>
);

interface InteractiveSceneProps extends Rock3DModelProps {
    setIsHoveringHotspot: React.Dispatch<React.SetStateAction<boolean>>;
}

const InteractiveScene: React.FC<InteractiveSceneProps> = ({ modelUrl, rock, setIsHoveringHotspot }) => {
    const controlsRef = useRef<any>(null);
    const [panEnabled, setPanEnabled] = useState(false);
    
    // Derive primary color from rock
    const primaryColor = useMemo(() => {
        if (!rock || !rock.color || rock.color.length === 0) return "#22d3ee";
        // Convert to hex if possible or return a default
        // ThreeJS handles CSS strings well, so we pass it through
        return rock.color[0];
    }, [rock]);

    // Zoom Handler
    const handleZoom = (direction: 'in' | 'out') => {
        if (controlsRef.current) {
            const controls = controlsRef.current;
            const camera = controls.object;
            const target = controls.target;
            
            // Vector from target to camera
            const offset = new THREE.Vector3().copy(camera.position).sub(target);
            
            // Scale the distance
            const factor = direction === 'in' ? 0.8 : 1.25;
            
            // Check limits (OrbitControls enforces them on update anyway)
            const newDist = offset.length() * factor;
            if (newDist >= controls.minDistance && newDist <= controls.maxDistance) {
                offset.multiplyScalar(factor);
                camera.position.copy(target).add(offset);
                controls.update();
            }
        }
    };

    // Reset Handler
    const handleReset = () => {
        if (controlsRef.current) {
            controlsRef.current.reset();
        }
    };

    return (
        <>
            <ambientLight intensity={0.2} />
            <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} color="#ffffff" castShadow />
            <pointLight position={[-10, -10, -5]} intensity={0.5} color="#4f46e5" />
            <pointLight position={[0, 5, 0]} intensity={0.8} color={primaryColor} distance={10} />

            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <Center>
                    <Specimen 
                        modelUrl={modelUrl} 
                        rock={rock} 
                        setIsHoveringHotspot={setIsHoveringHotspot} 
                    />
                </Center>
            </Float>

            <ScannerRig color={primaryColor} />
            
            <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} color="#000000" />
            
            <OrbitControls 
                ref={controlsRef}
                enableZoom={true} 
                enablePan={panEnabled} 
                minPolarAngle={Math.PI / 4} 
                maxPolarAngle={Math.PI - Math.PI / 4}
                minDistance={3}
                maxDistance={8}
                autoRotate={false}
                makeDefault
            />
            
            <Environment preset="city" blur={1} />
            
            {/* Control Panel Overlay */}
            <Html position={[0,0,0]} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} as='div' fullscreen zIndexRange={[50, 0]}>
                <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
                    <ControlButton onClick={() => handleZoom('in')} icon={<ZoomIn size={16} />} label="Zoom In" />
                    <ControlButton onClick={() => handleZoom('out')} icon={<ZoomOut size={16} />} label="Zoom Out" />
                    <ControlButton 
                        onClick={() => setPanEnabled(!panEnabled)} 
                        icon={<Move size={16} />} 
                        label={panEnabled ? "Pan: ON" : "Pan: OFF"} 
                        active={panEnabled}
                    />
                    <ControlButton onClick={handleReset} icon={<RotateCcw size={16} />} label="Reset View" />
                </div>
            </Html>
        </>
    );
};

export const Rock3DViewer: React.FC<Rock3DModelProps> = ({ modelUrl, rock }) => {
  const [isHoveringHotspot, setIsHoveringHotspot] = useState(false);
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
                <InteractiveScene 
                    modelUrl={modelUrl} 
                    rock={rock} 
                    setIsHoveringHotspot={setIsHoveringHotspot} 
                />
            </Suspense>
        </Canvas>

        {/* HUD UI Overlay - Bottom Status */}
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
        
        {/* Interaction Hint (Updated) */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[9px] text-gray-400 font-mono tracking-widest uppercase transition-opacity z-20 pointer-events-none ${isHoveringHotspot ? 'opacity-0' : 'opacity-100'}`}>
            Interact to Inspect
        </div>
    </div>
  );
};
