import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Confetti — fires once when `active` becomes true. Fills the viewport with colorful pieces.
 */
const COLORS = ["#2F8F6F", "#EEF1F6", "#E5A24A", "#8AB4F8", "#1B2340"];

export default function Confetti({ active, count = 90 }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!active) return;
    const w = window.innerWidth;
    const arr = Array.from({ length: count }).map((_, i) => ({
      id: i + "-" + Date.now(),
      x: Math.random() * w,
      delay: Math.random() * 0.25,
      dur: 1.6 + Math.random() * 1.4,
      size: 6 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotate: (Math.random() - 0.5) * 720,
      drift: (Math.random() - 0.5) * 200,
      shape: Math.random() > 0.5 ? "square" : "circle",
    }));
    setPieces(arr);
    const t = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(t);
  }, [active, count]);

  return (
    <AnimatePresence>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="fixed top-[-30px] pointer-events-none z-[9990]"
          style={{ left: p.x }}
          initial={{ y: 0, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: window.innerHeight + 100, x: p.drift, opacity: 0.9, rotate: p.rotate }}
          transition={{ duration: p.dur, delay: p.delay, ease: "linear" }}
        >
          <div
            style={{
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: p.shape === "circle" ? "9999px" : "2px",
            }}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
