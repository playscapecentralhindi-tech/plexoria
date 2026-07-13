"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { pageTransition } from "@/lib/animations";

export default function Template({ children }: { children: React.ReactNode }) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <>{children}</>;
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
