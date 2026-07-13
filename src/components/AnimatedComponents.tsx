"use client";

import React from "react";
import { motion, useReducedMotion, Variants, MotionProps } from "framer-motion";
import {
  fadeIn,
  fadeUp,
  fadeDown,
  fadeLeft,
  fadeRight,
  scaleIn,
  staggerContainer,
  staggerItem,
} from "@/lib/animations";

interface AnimationWrapperProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
}

// Helper to disable translation/scale animations for accessibility
const useAccessibleVariants = (variants: Variants, disableTransform = true): Variants => {
  const shouldReduce = useReducedMotion();

  if (!shouldReduce) return variants;

  // If user prefers reduced motion, strip out offsets and scale factors, keeping only opacity transitions
  const reducedVariants: Variants = {};
  for (const [key, value] of Object.entries(variants)) {
    if (typeof value === "object") {
      reducedVariants[key] = {
        ...value,
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        transition: { duration: 0.1 },
      };
    } else {
      reducedVariants[key] = value;
    }
  }
  return reducedVariants;
};

export const FadeIn: React.FC<AnimationWrapperProps> = ({
  children,
  className,
  delay = 0,
  once = true,
  ...props
}) => {
  const variants = useAccessibleVariants(fadeIn);
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const FadeUp: React.FC<AnimationWrapperProps> = ({
  children,
  className,
  delay = 0,
  once = true,
  ...props
}) => {
  const variants = useAccessibleVariants(fadeUp);
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-20px" }}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const FadeDown: React.FC<AnimationWrapperProps> = ({
  children,
  className,
  delay = 0,
  once = true,
  ...props
}) => {
  const variants = useAccessibleVariants(fadeDown);
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const FadeLeft: React.FC<AnimationWrapperProps> = ({
  children,
  className,
  delay = 0,
  once = true,
  ...props
}) => {
  const variants = useAccessibleVariants(fadeLeft);
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const FadeRight: React.FC<AnimationWrapperProps> = ({
  children,
  className,
  delay = 0,
  once = true,
  ...props
}) => {
  const variants = useAccessibleVariants(fadeRight);
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const ScaleIn: React.FC<AnimationWrapperProps> = ({
  children,
  className,
  delay = 0,
  once = true,
  ...props
}) => {
  const variants = useAccessibleVariants(scaleIn);
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

interface StaggerContainerProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  once?: boolean;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className,
  stagger = 0.05,
  delay = 0,
  once = true,
  ...props
}) => {
  return (
    <motion.div
      variants={staggerContainer(stagger, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-40px" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<AnimationWrapperProps> = ({
  children,
  className,
  ...props
}) => {
  const variants = useAccessibleVariants(staggerItem);
  return (
    <motion.div variants={variants} className={className} {...props}>
      {children}
    </motion.div>
  );
};
