import { useMotionValue, motion, useMotionTemplate } from "framer-motion";
import { MouseEvent } from "react";
import { cn } from "../../lib/utils";

interface CardSpotlightProps {
  children: React.ReactNode;
  radius?: number;
  color?: string;
  className?: string;
}

export const CardSpotlight = ({
  children,
  radius = 400,
  color = "rgba(255,255,255,0.1)",
  className = "",
}: CardSpotlightProps) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border border-neutral-800/50 bg-neutral-950/30 backdrop-blur-sm",
        className
      )}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${radius}px circle at ${mouseX}px ${mouseY}px,
              ${color},
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative z-10 p-6">{children}</div>
    </div>
  );
}; 