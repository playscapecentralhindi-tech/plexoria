"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          whileHover={{ scale: 1.08, translateY: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 border border-white/5 flex items-center justify-center text-white shadow-xl backdrop-blur-md transition-colors cursor-pointer"
          aria-label="Back to Top"
        >
          <ArrowUp size={18} className="text-[#EF4444]" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
