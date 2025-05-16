import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and tailwind-merge
 * This is used by shadcn/ui components for class name composition
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 