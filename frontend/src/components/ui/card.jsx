import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("rounded-[10px] border border-[#E2E5EA] bg-white text-[#101418]", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("space-y-1.5 p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("font-display text-base font-semibold leading-none tracking-normal", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("text-sm text-[#5B6472]", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}
