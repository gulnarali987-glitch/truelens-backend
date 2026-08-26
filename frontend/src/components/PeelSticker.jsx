import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * PeelSticker — draggable sticker with lifted corner + tilt + squish on drag.
 * Colors: yellow | coral | mint | blush | navy | paper | green | red
 */
export default function PeelSticker({
  children,
  color = "yellow",
  rotate = -4,
  className = "",
  size = "md",
  draggable = true,
  testid,
}) {
  const constraintsRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const sizeCls =
    size === "sm" ? "text-sm px-3 py-2 rounded-xl"
    : size === "lg" ? "text-3xl md:text-4xl px-6 py-4 rounded-3xl"
    : "text-lg md:text-xl px-4 py-3 rounded-2xl";

  return (
    <motion.div
      className={`peel ${color} ${sizeCls} inline-block will-change-transform ${className}`}
      style={{ rotate: `${rotate}deg` }}
      drag={draggable}
      dragElastic={0.6}
      dragMomentum={true}
      whileHover={{ scale: 1.06, rotate: rotate + 2 }}
      whileTap={{ scale: 0.95, rotate: rotate - 4 }}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      animate={dragging ? { scale: 1.08 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      data-testid={testid}
      data-noburst
    >
      {children}
    </motion.div>
  );
}
