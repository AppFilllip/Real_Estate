import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/utils";

export function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent shadow-inner transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BFCEFF] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#2E5BFF] data-[state=unchecked]:bg-[#E2E5EA]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5" />
    </SwitchPrimitive.Root>
  );
}
