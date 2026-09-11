import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/utils";

export const DropdownMenu = RadixDropdown.Root;
export const DropdownMenuTrigger = RadixDropdown.Trigger;

export function DropdownMenuContent({ className, sideOffset = 8, align = "end", ...props }) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-[220px] rounded-[10px] border border-[#E2E5EA] bg-white p-1.5 shadow-2xl outline-none",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      />
    </RadixDropdown.Portal>
  );
}

export function DropdownMenuLabel({ className, ...props }) {
  return (
    <div
      className={cn("px-3 py-2 text-[11px] font-bold uppercase tracking-[0.09em] text-[#8B93A1]", className)}
      {...props}
    />
  );
}

export function DropdownMenuItem({ className, ...props }) {
  return (
    <RadixDropdown.Item
      className={cn(
        "flex h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-[13px] outline-none data-[highlighted]:bg-[#F5F6F8]",
        className
      )}
      {...props}
    />
  );
}
