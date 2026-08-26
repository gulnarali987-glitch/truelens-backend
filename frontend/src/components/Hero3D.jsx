import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/** CSS/SVG-based playful hero background — parallax blobs, floating shapes, grid overlay. */
export default function Hero3D() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setPos({ x: (e.clientX - w / 2) / w, y: (e.clientY - h / 2) / h });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 z-0 overflow-hidden bg-[#1B2340]" data-testid="hero-3d-canvas">
      {/* Grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(238,241,246,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(238,241,246,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          transform: `translate3d(${pos.x * -20}px, ${pos.y * -20}px, 0)`,
        }}
      />

      {/* Big paper-blue blob */}
      <motion.div
        aria-hidden
        className="absolute rounded-full blur-3xl"
        style={{
          width: 720,
          height: 720,
          left: "-10%",
          top: "10%",
          background: "radial-gradient(circle at 30% 30%, #EEF1F6 0%, rgba(238,241,246,0.15) 45%, transparent 70%)",
        }}
        animate={{ x: pos.x * 60, y: pos.y * 60 }}
        transition={{ type: "spring", stiffness: 40, damping: 20 }}
      />
      {/* Green blob */}
      <motion.div
        aria-hidden
        className="absolute rounded-full blur-3xl"
        style={{
          width: 520,
          height: 520,
          right: "-8%",
          top: "-10%",
          background: "radial-gradient(circle at 50% 50%, #2F8F6F 0%, rgba(47,143,111,0.15) 40%, transparent 70%)",
        }}
        animate={{ x: pos.x * -80, y: pos.y * -50 }}
        transition={{ type: "spring", stiffness: 30, damping: 22 }}
      />
      {/* Red accent blob */}
      <motion.div
        aria-hidden
        className="absolute rounded-full blur-3xl"
        style={{
          width: 420,
          height: 420,
          right: "20%",
          bottom: "-10%",
          background: "radial-gradient(circle at 50% 50%, #C1443B 0%, rgba(193,68,59,0.14) 40%, transparent 70%)",
        }}
        animate={{ x: pos.x * -40, y: pos.y * -30 }}
        transition={{ type: "spring", stiffness: 30, damping: 22 }}
      />

      {/* Floating geometric shapes */}
      <FloatShape className="left-[15%] top-[22%]" size={80} rotate={12} delay={0}>
        <div className="w-full h-full rounded-2xl border border-white/25 backdrop-blur-sm bg-white/5" />
      </FloatShape>
      <FloatShape className="right-[18%] top-[30%]" size={110} rotate={-8} delay={0.4}>
        <div className="w-full h-full rounded-full border border-[#2F8F6F]/60 bg-[#2F8F6F]/10" />
      </FloatShape>
      <FloatShape className="left-[8%] bottom-[18%]" size={64} rotate={22} delay={0.8}>
        <div
          className="w-full h-full"
          style={{
            background: "linear-gradient(135deg, #EEF1F6 0%, #2F8F6F 100%)",
            clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
          }}
        />
      </FloatShape>
      <FloatShape className="right-[10%] bottom-[24%]" size={92} rotate={-14} delay={1.2}>
        <div
          className="w-full h-full rounded-3xl"
          style={{ background: "linear-gradient(135deg, #C1443B 0%, #1B2340 100%)" }}
        />
      </FloatShape>
      <FloatShape className="left-[45%] top-[12%]" size={54} rotate={45} delay={1.6}>
        <div className="w-full h-full rounded-md border-2 border-[#EEF1F6]/40" />
      </FloatShape>

      {/* Bottom scanline / vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#0F1428]/70" />
    </div>
  );
}

function FloatShape({ className = "", size = 80, rotate = 0, delay = 0, children }) {
  return (
    <motion.div
      aria-hidden
      className={`absolute ${className}`}
      style={{ width: size, height: size }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: [0, -16, 0],
        rotate: [rotate, rotate + 6, rotate],
      }}
      transition={{
        opacity: { duration: 0.8, delay },
        y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay },
        rotate: { duration: 8, repeat: Infinity, ease: "easeInOut", delay },
      }}
    >
      {children}
    </motion.div>
  );
}
