import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number | undefined | null): string {
  if (!cents) return "0.00";
  return (Math.round(cents) / 100).toFixed(2);
}
