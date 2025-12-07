
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Float, Sparkles, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Clover3DModelProps {
  isTalking: boolean;
  currentViseme: number; // 0-21
  audioPlaybackTime: number;
}

const HologramMaterial = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color('#4ade80') }, // Emerald green
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      // Scanline effect
      float scanline = sin(vUv.y * 50.0 - time * 5.0) * 0.1 + 0.9;

      // Fresnel effect for hologram edge glow
      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      float fresnel = pow(1.0 - dot(vNormal, viewDir), 2.0);

      // Glitch effect
      float glitch = step(0.98, sin(vUv.y * 10.0 + time * 20.0));

      vec3 finalColor = color * scanline + fresnel * vec3(0.5, 1.0, 0.8) + glitch * vec3(1.0);

      gl_FragColor = vec4(finalColor, 0.6 + fresnel * 0.4);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
};

const CloverMesh: React.FC<{ isTalking: boolean; currentViseme: number }> = ({ isTalking, currentViseme }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;

      // Talking animation based on viseme
      if (isTalking) {
          const scaleY = 1 + (currentViseme / 20) * 0.2; // Stretch based on viseme
          const scaleX = 1 - (currentViseme / 20) * 0.1; // Squash
          meshRef.current.scale.set(scaleX, scaleY, scaleX);
      } else {
          // Idle breathing
          meshRef.current.scale.set(1, 1, 1);
      }
    }
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  const shaderArgs = useMemo(() => ({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color('#4ade80') },
      },
      vertexShader: HologramMaterial.vertexShader,
      fragmentShader: HologramMaterial.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
  }), []);

  return (
    <group>
        {/* Main Clover Body - simplified as a cluster of spheres for now,
            ideally would be a loaded GLB model but we are building procedurally */}
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={meshRef} position={[0, 0, 0]}>
                {/* A simple clover shape using a torus knot for abstract look */}
                <torusKnotGeometry args={[0.8, 0.25, 100, 16]} />
                <shaderMaterial ref={materialRef} args={[shaderArgs]} />
            </mesh>
        </Float>
    </group>
  );
};

export const Clover3DModel: React.FC<Clover3DModelProps> = ({ isTalking, currentViseme }) => {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }} gl={{ alpha: true }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#4ade80" />
      <CloverMesh isTalking={isTalking} currentViseme={currentViseme} />
      <Sparkles count={50} scale={3} size={2} speed={0.4} opacity={0.5} color="#4ade80" />
      <Environment preset="city" />
    </Canvas>
  );
};

export default Clover3DModel;
