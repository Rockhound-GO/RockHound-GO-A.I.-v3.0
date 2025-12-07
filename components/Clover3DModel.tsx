import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Sparkles, Trail } from '@react-three/drei';
import * as THREE from 'three';

interface Clover3DModelProps {
  isTalking: boolean;
  currentViseme: number; // 0-21
  audioPlaybackTime?: number;
}

// -- ADVANCED HOLOGRAPHIC SHADER --
// Simulates a volumetric projection with scanlines, fresnel rim lighting, 
// and vertex displacement based on audio amplitude.

const vertexShader = `
  uniform float time;
  uniform float talkIntensity; // Driven by viseme (0.0 - 1.0)
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vDisplacement;

  // Pseudo-random noise
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // 1. Audio Ripple Effect
    // Waves move up the mesh based on time
    float ripple = sin(time * 15.0 - position.y * 10.0) * 0.05 * talkIntensity;
    
    // 2. Glitch Jitter
    // Random vertices snap out of place when talking loudly
    float jitter = step(0.95, random(vec2(time * 2.0, position.y))) * 0.1 * talkIntensity;
    
    // 3. Breathing Pulse
    float breath = sin(time * 2.0) * 0.02;

    // Apply displacement along normal
    vDisplacement = ripple + jitter + breath;
    vec3 newPos = position + normal * vDisplacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform vec3 color;
  uniform float talkIntensity;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vDisplacement;

  void main() {
    // 1. High-Tech Scanlines
    float scanline = sin(vUv.y * 150.0 + time * -5.0) * 0.5 + 0.5;
    
    // 2. Fresnel Rim Light (The "Ghost" Effect)
    vec3 viewDir = vec3(0.0, 0.0, 1.0); // Simplified view dir
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 2.5);
    
    // 3. Core Pulse
    // Brighter in the center, pulsing with time
    float coreGlow = 0.5 + 0.5 * sin(time * 3.0);
    
    // Compose Color
    // Base color + Rim Light + Audio Reaction Brightness
    vec3 finalColor = color * (0.1 + scanline * 0.2);
    finalColor += color * fresnel * 2.5; // Strong rim light
    finalColor += vec3(1.0) * talkIntensity * scanline * 0.8; // White hot flashes when talking
    
    // Opacity Logic
    // Edges are opaque, center is semi-transparent (Volume effect)
    float alpha = 0.1 + fresnel * 0.9 + talkIntensity * 0.3;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const AI_COLOR = new THREE.Color('#22d3ee'); // Cyan-400 equivalent

const CoreMesh: React.FC<{ isTalking: boolean; visemeIntensity: number }> = ({ isTalking, visemeIntensity }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const shaderArgs = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
      color: { value: AI_COLOR },
      talkIntensity: { value: 0 }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    // Rotate the core slowly
    meshRef.current.rotation.y -= delta * 0.2;
    meshRef.current.rotation.z += delta * 0.1;

    // Update Uniforms
    materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    
    // Smoothly interpolate the talking intensity for the shader
    // This prevents the mesh from snapping instantly between visemes
    const targetIntensity = isTalking ? 0.2 + (visemeIntensity / 21) * 0.8 : 0;
    materialRef.current.uniforms.talkIntensity.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.talkIntensity.value,
      targetIntensity,
      delta * 15 // Speed of reaction
    );
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 6]} /> {/* High poly for smooth ripples */}
      <shaderMaterial ref={materialRef} args={[shaderArgs]} />
    </mesh>
  );
};

const ContainmentRing: React.FC<{ radius: number; speed: number; axis: 'x' | 'y' | 'z' }> = ({ radius, speed, axis }) => {
    const ref = useRef<THREE.Group>(null);
    
    useFrame((_, delta) => {
        if (ref.current) {
            if (axis === 'x') ref.current.rotation.x += delta * speed;
            if (axis === 'y') ref.current.rotation.y += delta * speed;
            if (axis === 'z') ref.current.rotation.z += delta * speed;
        }
    });

    return (
        <group ref={ref}>
            {/* Thin wireframe ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[radius, 0.02, 16, 100]} />
                <meshBasicMaterial color={AI_COLOR} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Orbital Particle with Trail */}
            <group rotation={[Math.PI / 2, 0, 0]}>
                <group position={[radius, 0, 0]}>
                    <Trail width={2} length={8} color={new THREE.Color('#4f46e5')} attenuation={(t) => t * t}>
                        <mesh>
                            <sphereGeometry args={[0.08, 16, 16]} />
                            <meshBasicMaterial color="#ffffff" toneMapped={false} />
                        </mesh>
                    </Trail>
                </group>
            </group>
        </group>
    );
};

const DataCloud: React.FC = () => {
    const ref = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (ref.current) ref.current.rotation.y += delta * 0.05;
    });

    return (
        <group ref={ref}>
            <Sparkles 
                count={40} 
                scale={4} 
                size={4} 
                speed={0.4} 
                opacity={0.5} 
                color="#a5f3fc" 
            />
        </group>
    )
}

export const Clover3DModel: React.FC<Clover3DModelProps> = ({ isTalking, currentViseme }) => {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 40 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#22d3ee" />
      <pointLight position={[-10, -5, -10]} intensity={0.5} color="#4f46e5" />

      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group scale={1.2}>
            {/* The Brain */}
            <CoreMesh isTalking={isTalking} visemeIntensity={currentViseme} />
            
            {/* The Gyroscope Structure */}
            <ContainmentRing radius={1.4} speed={0.5} axis="x" />
            <ContainmentRing radius={1.6} speed={0.3} axis="y" />
            <ContainmentRing radius={1.8} speed={0.4} axis="z" />
            
            {/* Atmosphere */}
            <DataCloud />
        </group>
      </Float>

      <Environment preset="city" />
    </Canvas>
  );
};

export default Clover3DModel;