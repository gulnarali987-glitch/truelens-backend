import React, { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Playful floating 3D shape */
function FloatShape({ position, color = "#EEF1F6", geo = "icosa", speed = 1, scale = 1, wireframe = false }) {
  const ref = useRef();
  const start = useRef(Math.random() * Math.PI * 2);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = t * 0.25 * speed + start.current;
    ref.current.rotation.y = t * 0.35 * speed + start.current;
    ref.current.position.y = position[1] + Math.sin(t * 0.8 + start.current) * 0.3;
    // Mouse parallax
    const { x, y } = state.mouse;
    ref.current.position.x = position[0] + x * 0.4;
  });
  let geometry;
  if (geo === "torus") geometry = <torusKnotGeometry args={[0.8, 0.28, 180, 32]} />;
  else if (geo === "octa") geometry = <octahedronGeometry args={[1, 0]} />;
  else if (geo === "dodeca") geometry = <dodecahedronGeometry args={[1, 0]} />;
  else if (geo === "cone") geometry = <coneGeometry args={[0.9, 1.6, 6]} />;
  else geometry = <icosahedronGeometry args={[1, 0]} />;
  return (
    <mesh ref={ref} position={position} scale={scale}>
      {geometry}
      <meshStandardMaterial
        color={color}
        metalness={0.35}
        roughness={0.28}
        flatShading
        wireframe={wireframe}
      />
    </mesh>
  );
}

function CanvasContents() {
  return (
    <>
      <color attach="background" args={["#1B2340"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 6, 4]} intensity={1.4} color="#EEF1F6" />
      <directionalLight position={[-6, -3, 2]} intensity={0.7} color="#2F8F6F" />
      <pointLight position={[3, -2, 4]} intensity={0.6} color="#C1443B" />
      <FloatShape position={[-3.4, 0.8, -1]} color="#EEF1F6" geo="icosa" speed={0.9} scale={1.2} />
      <FloatShape position={[3.4, -0.6, -1.5]} color="#2F8F6F" geo="torus" speed={1.1} scale={0.95} />
      <FloatShape position={[0.5, 1.9, -3]} color="#C1443B" geo="dodeca" speed={0.7} scale={0.9} />
      <FloatShape position={[-1.6, -1.8, -0.5]} color="#EEF1F6" geo="octa" speed={1.3} scale={0.7} wireframe />
      <FloatShape position={[2.2, 1.7, -2]} color="#E5A24A" geo="cone" speed={0.8} scale={0.7} />
      <FloatShape position={[-2.8, -1.2, -2]} color="#EEF1F6" geo="torus" speed={0.6} scale={0.55} wireframe />
    </>
  );
}

export default function Hero3D() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#1B2340]" data-testid="hero-3d-canvas">
      {/* Grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none z-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(238,241,246,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(238,241,246,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {ready && (
        <Canvas
          camera={{ position: [0, 0, 6], fov: 55 }}
          dpr={[1, 1.6]}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <CanvasContents />
          </Suspense>
        </Canvas>
      )}
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-transparent via-transparent to-[#0F1428]/70" />
    </div>
  );
}
