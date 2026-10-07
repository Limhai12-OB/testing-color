"use client";

import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

type AnimatedBeamProps = {
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  duration?: number;
  delay?: number;
};

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  duration = 3,
  delay = 0,
}: AnimatedBeamProps) {
  const id = useId().replace(/:/g, "");
  const [geometry, setGeometry] = useState({ width: 0, height: 0, path: "" });
  useEffect(() => {
    const container = containerRef.current;
    const from = fromRef.current;
    const to = toRef.current;
    if (!container || !from || !to) return;
    const measure = () => {
      const bounds = container.getBoundingClientRect();
      const start = from.getBoundingClientRect();
      const end = to.getBoundingClientRect();
      setGeometry({
        width: bounds.width,
        height: bounds.height,
        path: `M ${start.left - bounds.left + start.width / 2} ${start.top - bounds.top + start.height / 2} L ${end.left - bounds.left + end.width / 2} ${end.top - bounds.top + end.height / 2}`,
      });
    };
    measure();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(container);
    observer?.observe(from);
    observer?.observe(to);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, fromRef, toRef]);
  return (
    <svg
      className="landing-animated-beam"
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width || 1} ${geometry.height || 1}`}
      fill="none"
      aria-hidden="true"
      style={
        {
          "--beam-duration": `${duration}s`,
          "--beam-delay": `${delay}s`,
        } as CSSProperties
      }
    >
      <defs>
        <linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2={geometry.height || 1}
        >
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="50%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <path d={geometry.path} stroke="#e2e8f0" strokeWidth="2" />
      <path
        className="landing-beam-pulse landing-beam-glow"
        d={geometry.path}
        pathLength="100"
        stroke={`url(#${id})`}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        className="landing-beam-pulse"
        d={geometry.path}
        pathLength="100"
        stroke={`url(#${id})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
