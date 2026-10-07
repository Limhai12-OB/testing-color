import type { ComponentProps } from "react";

export function Marquee({
  children,
  reverse = false,
  pauseOnHover = false,
  className = "",
  ...props
}: ComponentProps<"div"> & { reverse?: boolean; pauseOnHover?: boolean }) {
  return (
    <div
      {...props}
      className={`ledger-marquee ${reverse ? "ledger-marquee-reverse" : ""} ${pauseOnHover ? "ledger-marquee-hover" : ""} ${className}`}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className="ledger-marquee-group"
          key={index}
          aria-hidden={index > 0 ? true : undefined}
          inert={index > 0 ? true : undefined}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
