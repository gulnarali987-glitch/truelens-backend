import React, { useRef, useState } from "react";

/**
 * MagneticButton — the element leans/attracts toward the cursor while hovering.
 * Use as a drop-in wrapper. Children are your actual button/link.
 */
export default function MagneticButton({ children, strength = 0.35, className = "" }) {
  const ref = useRef(null);
  const [t, setT] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setT({ x: (e.clientX - cx) * strength, y: (e.clientY - cy) * strength });
  };
  const reset = () => setT({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`inline-block ${className}`}
      style={{
        transform: `translate3d(${t.x}px, ${t.y}px, 0)`,
        transition: t.x === 0 && t.y === 0 ? "transform 420ms cubic-bezier(0.22,1,0.36,1)" : "transform 90ms ease-out",
      }}
    >
      {children}
    </div>
  );
}
