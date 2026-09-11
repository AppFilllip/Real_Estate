import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5BFF] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#2E5BFF] text-white shadow-sm hover:bg-[#1E45D6]",
        secondary: "border border-[#D8DCE3] bg-white text-[#101418] shadow-sm hover:bg-[#F1F3F6] hover:border-[#C3C9D2]",
        ghost: "text-[#5B6472] hover:bg-[#EEF0F3] hover:text-[#101418]",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        outlineDestructive: "border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        icon: "h-9 w-9 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
