"use client";

import { useRef } from "react";
import { AnimatedBeam } from "@/registry/magicui/animated-beam";

export function LandingWorkflow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLSpanElement>(null);
  const secondRef = useRef<HTMLSpanElement>(null);
  const thirdRef = useRef<HTMLSpanElement>(null);
  const refs = [firstRef, secondRef, thirdRef];
  return (
    <div className="landing-workflow-beams" ref={containerRef}>
      <ol>
        {[
          [
            "Bring it together",
            "Add your transactions, invoices, and bills, or import your existing records.",
          ],
          [
            "Find your perspective",
            "See your cash position, track expenses, and understand each branch.",
          ],
          [
            "Move forward with clarity",
            "Use reports and forecasting to explore your next business decision.",
          ],
        ].map(([title, text], index) => (
          <li key={title}>
            <span className="landing-step-circle" ref={refs[index]}>
              0{index + 1}
            </span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={firstRef}
        toRef={secondRef}
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={secondRef}
        toRef={thirdRef}
        duration={3}
        delay={1.5}
      />
    </div>
  );
}
