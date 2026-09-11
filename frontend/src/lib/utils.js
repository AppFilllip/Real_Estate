import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function moneyCompact(value) {
  const num = Number(value || 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  const trim = (n) => n.toFixed(2).replace(/\.?0+$/, "");
  if (abs >= 1_00_00_000) return `${sign}₹${trim(abs / 1_00_00_000)} Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trim(abs / 1_00_000)} L`;
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000)} K`;
  return money(num);
}
