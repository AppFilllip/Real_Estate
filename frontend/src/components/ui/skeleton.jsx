import { cn } from "../../lib/utils";

export function Skeleton({ className, ...props }) {
  return <div className={cn("animate-pulse rounded-md bg-[#EEF0F3]", className)} {...props} />;
}
