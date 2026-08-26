import React, { useRef, useState } from "react";

/**
 * TiltCard — CSS 3D perspective tilt on hover. Wraps any content.
 */
export default function TiltCard({ children, className = "", max = 12, glare = true, testid }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const px = x / r.width;
    const py = y / r.height;
    setTilt({
      rx: (0.5 - py) * max,
      ry: (px - 0.5) * max,
      mx: px * 100,
      my: py * 100,
      active: true,
    });
  };
  const reset = () => setTilt({ rx: 0, ry: 0, mx: 50, my: 50, active: false });

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`relative ${className}`}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: tilt.active ? "transform 80ms ease-out" : "transform 400ms cubic-bezier(0.22,1,0.36,1)",
        transformStyle: "preserve-3d",
      }}
      data-testid={testid}
    >
      {children}
      {glare && (
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, rgba(255,255,255,0.35), transparent 45%)`,
            opacity: tilt.active ? 1 : 0,
            transition: "opacity 260ms ease",
            mixBlendMode: "overlay",
          }}
        />
      )}
    </div>
  );
}
