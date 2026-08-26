import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * GlowCursor — big soft dot + snappy inner dot that follows the pointer.
 * Auto-hides on touch devices.
 */
export default function GlowCursor() {
  const bigRef = useRef(null);
  const dotRef = useRef(null);
  const [touch, setTouch] = useState(false);
  const state = useRef({ x: 0, y: 0, tx: 0, ty: 0, hovering: false });

  useEffect(() => {
    if (typeof window === "undefined") return;
    // touch device check
    const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) { setTouch(true); return; }

    const onMove = (e) => {
      state.current.tx = e.clientX;
      state.current.ty = e.clientY;
      // inner dot snaps immediately
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX - 4}px, ${e.clientY - 4}px, 0)`;
      }
    };
    const onOver = (e) => {
      const t = e.target;
      const isInteractive = t.closest?.("button, a, [role='button'], input, textarea, [data-cursor='hover']");
      state.current.hovering = !!isInteractive;
    };
    const onDown = () => {
      if (bigRef.current) bigRef.current.style.transform += " scale(0.6)";
    };
    const onUp = () => {
      // rebuild transform in tick
    };

    let raf;
    const tick = () => {
      state.current.x += (state.current.tx - state.current.x) * 0.18;
      state.current.y += (state.current.ty - state.current.y) * 0.18;
      const size = state.current.hovering ? 60 : 36;
      if (bigRef.current) {
        bigRef.current.style.width = size + "px";
        bigRef.current.style.height = size + "px";
        bigRef.current.style.transform = `translate3d(${state.current.x - size / 2}px, ${state.current.y - size / 2}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (touch) return null;
  return (
    <>
      <div
        ref={bigRef}
        aria-hidden
        className="fixed top-0 left-0 pointer-events-none z-[9998] rounded-full mix-blend-difference"
        style={{
          width: 36,
          height: 36,
          background: "radial-gradient(circle at 50% 50%, #EEF1F6 0%, rgba(238,241,246,0.35) 45%, transparent 70%)",
          transition: "width 220ms cubic-bezier(0.22,1,0.36,1), height 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full mix-blend-difference"
        style={{ width: 8, height: 8, background: "#EEF1F6" }}
      />
      <style>{`html, body, * { cursor: none !important; }
        @media (pointer: coarse) { html, body, * { cursor: auto !important; } }`}</style>
    </>
  );
}
