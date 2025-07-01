import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface ImageSlide {
  src: string;
  alt: string;
}

interface AnimatedImageSliderProps {
  images: ImageSlide[];
  autoplay?: boolean;
  className?: string;
  isDark?: boolean;
}

export function AnimatedImageSlider({ 
  images, 
  autoplay = true,
  className = "",
  isDark = true
}: AnimatedImageSliderProps) {
  const [active, setActive] = useState(0);

  const handleNext = () => {
    setActive((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + images.length) % images.length);
  };

  const isActive = (index: number) => {
    return index === active;
  };

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(handleNext, 5000);
      return () => clearInterval(interval);
    }
  }, [autoplay]);

  const randomRotateY = () => {
    return Math.floor(Math.random() * 21) - 10;
  };

  return (
    <div className={`max-w-sm md:max-w-4xl mx-auto px-4 md:px-8 lg:px-12 ${className}`}>
      <div className="relative">
        <div className="relative h-80 w-full">
          <AnimatePresence>
            {images.map((image, index) => (
              <motion.div
                key={image.src}
                initial={{
                  opacity: 0,
                  scale: 0.9,
                  rotate: randomRotateY(),
                }}
                animate={{
                  opacity: isActive(index) ? 1 : 0.7,
                  scale: isActive(index) ? 1 : 0.95,
                  rotate: isActive(index) ? 0 : randomRotateY(),
                  zIndex: isActive(index) ? 999 : images.length + 2 - index,
                  y: isActive(index) ? [0, -20, 0] : 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  rotate: randomRotateY(),
                }}
                transition={{
                  duration: 0.4,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 origin-bottom"
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-full w-full rounded-xl object-cover object-center shadow-xl"
                  draggable={false}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        <div className="flex gap-4 pt-4 justify-center">
          <button
            onClick={handlePrev}
            className={cn(
              "h-10 w-10 rounded-full backdrop-blur-sm transition-colors flex items-center justify-center group/button",
              isDark
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-gray-200/70 hover:bg-gray-300/70 text-slate-700"
            )}
            aria-label="Previous image"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-hover/button:rotate-12 transition-transform duration-300"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className={cn(
              "h-10 w-10 rounded-full backdrop-blur-sm transition-colors flex items-center justify-center group/button",
              isDark
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-gray-200/70 hover:bg-gray-300/70 text-slate-700"
            )}
            aria-label="Next image"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-hover/button:-rotate-12 transition-transform duration-300"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 