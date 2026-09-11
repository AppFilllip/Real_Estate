import { cn } from "../../lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "flex h-[38px] w-full rounded-md border border-[#E2E5EA] bg-white px-3 text-[13px] text-[#101418] outline-none transition-colors placeholder:text-[#8B93A1] focus-visible:border-[#C9CED6] focus-visible:ring-2 focus-visible:ring-[#BFCEFF] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
