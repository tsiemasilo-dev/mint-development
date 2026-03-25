import { useState, useRef, startTransition } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const OriginButton = ({ children, onClick, className, circleColor = "rgba(148,163,184,0.18)", style, type = "button", "aria-label": ariaLabel }) => {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const scale = useMotionValue(0);
  const smoothScale = useSpring(scale, { stiffness: 85, damping: 18, restDelta: 0.001 });

  const handleMouseEnter = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    startTransition(() => setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top }));
    scale.set(1);
  };

  const handleMouseLeave = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    startTransition(() => setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top }));
    scale.set(0);
  };

  return (
    <button
      ref={containerRef}
      type={type}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ ...style, position: "relative", overflow: "hidden" }}
      aria-label={ariaLabel}
    >
      <motion.span
        style={{
          position: "absolute",
          left: cursorPos.x,
          top: cursorPos.y,
          width: 500,
          height: 500,
          borderRadius: "50%",
          backgroundColor: circleColor,
          scale: smoothScale,
          x: "-50%",
          y: "-50%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1, display: "contents" }}>{children}</span>
    </button>
  );
};

export default OriginButton;
