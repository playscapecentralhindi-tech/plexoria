import { Variants, Transition } from "framer-motion";

// Helper for standard spring transition
export const springTransition: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 22,
};

// Helper for smooth cubic-bezier transition (standard in premium design systems)
export const smoothTransition: Transition = {
  type: "tween",
  ease: [0.16, 1, 0.3, 1], // easeOutExpo
  duration: 0.6,
};

// ── FADES ──
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: "easeIn" } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
  exit: { opacity: 0, y: 15, transition: { duration: 0.3, ease: "easeIn" } },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -25 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
  exit: { opacity: 0, y: -15, transition: { duration: 0.3, ease: "easeIn" } },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: 25 },
  visible: { opacity: 1, x: 0, transition: smoothTransition },
  exit: { opacity: 0, x: -15, transition: { duration: 0.3, ease: "easeIn" } },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: -25 },
  visible: { opacity: 1, x: 0, transition: smoothTransition },
  exit: { opacity: 0, x: 15, transition: { duration: 0.3, ease: "easeIn" } },
};

// ── SCALES & ZOOMS ──
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: springTransition },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
};

export const zoomIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: springTransition },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.25 } },
};

export const rotateIn: Variants = {
  hidden: { opacity: 0, scale: 0.8, rotate: -8 },
  visible: { opacity: 1, scale: 1, rotate: 0, transition: springTransition },
  exit: { opacity: 0, scale: 0.8, rotate: 8, transition: { duration: 0.25 } },
};

// ── STAGGER CONTAINERS ──
export const staggerContainer = (staggerChildren = 0.05, delayChildren = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

// ── ROUTE / PAGE TRANSITIONS ──
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.35, ease: "easeIn" } },
};

// ── MODAL & DRAWERS ──
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, scale: 0.95, y: 15, transition: { duration: 0.2, ease: "easeIn" } },
};

export const drawerRightVariants: Variants = {
  hidden: { x: "100%", opacity: 0.9 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 380, damping: 30 } },
  exit: { x: "100%", opacity: 0.9, transition: { duration: 0.3, ease: "easeInOut" } },
};

export const drawerLeftVariants: Variants = {
  hidden: { x: "-100%", opacity: 0.9 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 380, damping: 30 } },
  exit: { x: "-100%", opacity: 0.9, transition: { duration: 0.3, ease: "easeInOut" } },
};

// ── DROPDOWNS & TOASTS ──
export const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
  exit: { opacity: 0, scale: 0.95, y: -5, transition: { duration: 0.15 } },
};

export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 20 } },
  exit: { opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } },
};

// ── HOVER & TAP INTERACTIONS ──
export const hoverScale = {
  scale: 1.05,
  transition: { duration: 0.2, ease: "easeInOut" },
};

export const tapScale = {
  scale: 0.95,
};

export const hoverGlow = {
  scale: 1.02,
  boxShadow: "0 0 25px rgba(229, 9, 20, 0.45)",
  transition: { duration: 0.2, ease: "easeInOut" },
};

// ── FLOATING / INFINITE ANIMATIONS ──
export const floatAnimation: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export const infiniteBackground: Variants = {
  animate: {
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
    transition: {
      duration: 15,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};
