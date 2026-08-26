import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function Blob({ position, color, geo = "icosa", speed = 1, scale = 1 }) {
  const ref = useRef();
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime;
    ref.current.rotation.x = t * 0.2 * speed;
    ref.current.rotation.y = t * 0.3 * speed;
    ref.current.position.y = position[1] + Math.sin(t * 0.7) * 0.15;
  });
  const g = geo === "torus"
    ? <torusKnotGeometry args={[0.65, 0.22, 160, 28]} />
    : geo === "octa"
    ? <octahedronGeometry args={[0.9, 0]} />
    : <icosahedronGeometry args={[0.9, 0]} />;
  return (
    <mesh ref={ref} position={position} scale={scale}>
      {g}
      <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} flatShading />
    </mesh>
  );
}

/** Ambient 3D canvas — subtle, sits behind workspace content. */
export default function AmbientCanvas() {
  return (
    <div className="absolute inset-0 -z-0 pointer-events-none opacity-70" aria-hidden>
      <Canvas camera={{ position: [0, 0, 6], fov: 55 }} dpr={[1, 1.4]} gl={{ alpha: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 5, 4]} intensity={1.1} color="#EEF1F6" />
        <directionalLight position={[-5, -2, 3]} intensity={0.6} color="#2F8F6F" />
        <Suspense fallback={null}>
          <Blob position={[-4.5, 1.4, -1]} color="#2F8F6F" geo="icosa" scale={0.8} />
          <Blob position={[4.3, -1.6, -2]} color="#C1443B" geo="torus" scale={0.7} />
          <Blob position={[3.6, 1.8, -3]} color="#1B2340" geo="octa" scale={0.6} />
          <Blob position={[-4.1, -1.9, -2.5]} color="#E5A24A" geo="icosa" scale={0.5} />
        </Suspense>
      </Canvas>
    </div>
  );
}
