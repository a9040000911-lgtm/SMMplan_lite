import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number | undefined | null, decimals: number = 2): string {
  if (!cents) return decimals === 0 ? "0" : (0).toFixed(decimals);
  return (Math.round(cents) / 100).toFixed(decimals);
}
