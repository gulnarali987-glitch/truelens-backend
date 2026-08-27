import React from "react";
import { motion } from "framer-motion";

/**
 * PopHeading — display headline in pop/screen-print style.
 * Renders each word twice as color-offset "layers" behind the base word,
 * plus a subtle drop-in reveal per character.
 */
export default function PopHeading({ text, className = "", offset = true, delay = 0 }) {
  const chars = Array.from(text);

  return (
    <h1 className={`font-poster leading-[0.9] text-[#1B2340] ${className}`} data-testid="pop-heading">
      <span className="print-stack">
        {offset && (
          <>
            <span className="layer a" aria-hidden>{text}</span>
            <span className="layer b" aria-hidden>{text}</span>
          </>
        )}
        <span className="base">
          {chars.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: delay + i * 0.025,
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-block"
              style={{ whiteSpace: ch === " " ? "pre" : "normal" }}
            >
              {ch}
            </motion.span>
          ))}
        </span>
      </span>
    </h1>
  );
}
