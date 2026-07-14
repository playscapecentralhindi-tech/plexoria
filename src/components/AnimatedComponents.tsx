"use client";

import { motion, Variants } from "framer-motion";
import { ReactNode, useRef } from "react";

/* ============================================================
   SPRING MOTION TOKENS
   ============================================================ */
const SPRING_GENTLE = { type: "spring", stiffness: 280, damping: 30, mass: 0.8 } as const;
const SPRING_SNAPPY = { type: "spring", stiffness: 400, damping: 28, mass: 0.7 } as const;
const SPRING_BOUNCY = { type: "spring", stiffness: 320, damping: 20, mass: 0.9 } as const;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ============================================================
   FADE UP — Primary entrance animation
   ============================================================ */
interface FadeUpProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
}

export function FadeUp({
  children,
  className = "",
  delay = 0,
  duration = 0.55,
  once = true,
}: FadeUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-40px" }}
      transition={{
        duration,
        delay,
        ease: EASE_OUT_EXPO,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   SCALE IN — For modals, cards, dialogs
   ============================================================ */
interface ScaleInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ScaleIn({ children, className = "", delay = 0 }: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ ...SPRING_GENTLE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   GLASS REVEAL — blur + fade combo (glass surfaces appearing)
   ============================================================ */
interface GlassRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function GlassReveal({ children, className = "", delay = 0 }: GlassRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
      transition={{ duration: 0.45, delay, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   SLIDE IN — Drawer / panel entrance
   ============================================================ */
interface SlideInProps {
  children: ReactNode;
  className?: string;
  from?: "left" | "right" | "bottom";
  delay?: number;
}

export function SlideIn({
  children,
  className = "",
  from = "left",
  delay = 0,
}: SlideInProps) {
  const initial =
    from === "left" ? { x: -32, opacity: 0 }
    : from === "right" ? { x: 32, opacity: 0 }
    : { y: 24, opacity: 0 };

  return (
    <motion.div
      initial={initial}
      animate={{ x: 0, y: 0, opacity: 1 }}
      exit={initial}
      transition={{ ...SPRING_SNAPPY, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   STAGGER CONTAINER — Children animate in sequence
   ============================================================ */
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 28,
    },
  },
};

export function StaggerContainer({
  children,
  className = "",
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={childVariants} className={className}>
      {children}
    </motion.div>
  );
}

/* ============================================================
   HOVER LIFT — Subtle lift on hover for glass cards
   ============================================================ */
interface HoverLiftProps {
  children: ReactNode;
  className?: string;
  liftAmount?: number;
  scaleAmount?: number;
}

export function HoverLift({
  children,
  className = "",
  liftAmount = 4,
  scaleAmount = 1.015,
}: HoverLiftProps) {
  return (
    <motion.div
      whileHover={{
        y: -liftAmount,
        scale: scaleAmount,
        transition: SPRING_GENTLE,
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   PULSE (breathing light effect)
   ============================================================ */
export function Pulse({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      animate={{ opacity: [0.85, 1, 0.85] }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   DRAWER VARIANTS (for Navbar mobile)
   ============================================================ */
export const drawerLeftVariants: Variants = {
  hidden: { x: "-100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { ...SPRING_SNAPPY },
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: { duration: 0.25, ease: EASE_OUT_EXPO },
  },
};

export const drawerOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.20, ease: "easeIn" },
  },
};

/* ============================================================
   BACKWARDS-COMPAT ALIASES (keep existing consumers working)
   ============================================================ */

/** @deprecated Use FadeUp instead */
export { FadeUp as FadeIn };

/** Framer Motion variant object for simple fade-in (for legacy use) */
export const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};
