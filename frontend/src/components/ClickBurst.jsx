import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * ClickBurst — every click on the page spawns a burst of playful particles at that point.
 * Skips events fired from inside data-noburst elements and inputs/textareas.
 */
const COLORS = ["#2F8F6F", "#C1443B", "#E5A24A", "#EEF1F6", "#1B2340", "#8AB4F8"];
const SHAPES = ["circle", "square", "triangle", "cross"];

let idCounter = 0;

function Particle({ x, y, angle, distance, size, color, shape, rotate }) {
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance - 30; // slight upward bias for playful pop
  const style = { width: size, height: size };
  let inner;
  if (shape === "circle") {
    inner = <div style={{ ...style, background: color, borderRadius: "9999px" }} />;
  } else if (shape === "square") {
    inner = <div style={{ ...style, background: color, borderRadius: 3 }} />;
  } else if (shape === "triangle") {
    inner = (
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${size / 2}px solid transparent`,
          borderRight: `${size / 2}px solid transparent`,
          borderBottom: `${size}px solid ${color}`,
        }}
      />
    );
  } else {
    inner = (
      <div style={{ position: "relative", ...style }}>
        <div style={{ position: "absolute", inset: 0, background: color, transform: "rotate(45deg) scaleY(0.25)" }} />
        <div style={{ position: "absolute", inset: 0, background: color, transform: "rotate(-45deg) scaleY(0.25)" }} />
      </div>
    );
  }
  return (
    <motion.div
      className="pointer-events-none fixed z-[9997]"
      style={{ left: x, top: y }}
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
      animate={{ x: dx, y: dy, opacity: 0, rotate, scale: 1 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
    >
      {inner}
    </motion.div>
  );
}

export default function ClickBurst() {
  const [bursts, setBursts] = useState([]);

  const spawn = useCallback((e) => {
    // Skip form inputs, textareas — typing burst is annoying
    const t = e.target;
    if (!t) return;
    if (t.closest?.("input, textarea, select, [data-noburst]")) return;
    const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const count = isTouch ? 10 : 14;
    const cx = e.clientX;
    const cy = e.clientY;
    const parts = Array.from({ length: count }).map(() => ({
      id: ++idCounter,
      angle: Math.random() * Math.PI * 2,
      distance: 60 + Math.random() * 110,
      size: 6 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      rotate: (Math.random() - 0.5) * 360,
    }));
    const b = { id: ++idCounter, x: cx, y: cy, parts };
    setBursts((prev) => [...prev, b]);
    setTimeout(() => setBursts((prev) => prev.filter((x) => x.id !== b.id)), 1000);
  }, []);

  useEffect(() => {
    window.addEventListener("pointerdown", spawn);
    return () => window.removeEventListener("pointerdown", spawn);
  }, [spawn]);

  return (
    <AnimatePresence>
      {bursts.map((b) => (
        <React.Fragment key={b.id}>
          {b.parts.map((p) => (
            <Particle key={p.id} x={b.x} y={b.y} {...p} />
          ))}
        </React.Fragment>
      ))}
    </AnimatePresence>
  );
}
