"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Money } from "./ui";

// Lightweight adaptations of Magic UI's Magic Card and Number Ticker patterns.
// https://magicui.design/docs/components/magic-card
// https://magicui.design/docs/components/number-ticker
export function MagicCard({
  className = "",
  children,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`magic-card ${className}`}
      onPointerMove={(event) => {
        if (
          event.pointerType !== "mouse" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty(
          "--spot-x",
          `${event.clientX - bounds.left}px`,
        );
        event.currentTarget.style.setProperty(
          "--spot-y",
          `${event.clientY - bounds.top}px`,
        );
      }}
    >
      {children}
    </button>
  );
}

export function DashboardNumber({
  value,
  currency,
  percent = false,
}: {
  value: number;
  currency: string;
  percent?: boolean;
}) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(0);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const from = previous.current;
    const start = performance.now();
    const finish = () => {
      cancelAnimationFrame(frame);
      previous.current = value;
      setDisplay(value);
    };
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 700, 1);
      const next = from + (value - from) * (1 - Math.pow(1 - progress, 3));
      previous.current = next;
      setDisplay(progress === 1 ? value : next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    if (preference.matches) finish();
    else frame = requestAnimationFrame(tick);
    preference.addEventListener("change", finish);
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", finish);
    };
  }, [value]);
  const render = (amount: number) =>
    percent ? (
      `${amount.toFixed(1)}%`
    ) : (
      <Money value={amount} currency={currency} />
    );
  return (
    <span className="number-ticker">
      <span className="motion-sr-only">{render(value)}</span>
      <span aria-hidden="true" className="ticker-visual">
        {render(display)}
      </span>
    </span>
  );
}
