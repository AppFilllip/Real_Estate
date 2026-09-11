import { cn } from "../../lib/utils";

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "flex h-[38px] w-full rounded-md border border-[#E2E5EA] bg-white px-3 text-[13px] text-[#101418] outline-none transition-colors focus-visible:border-[#C9CED6] focus-visible:ring-2 focus-visible:ring-[#BFCEFF] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
