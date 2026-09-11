import { cn } from "../../lib/utils";

export function Table({ className, ...props }) {
  return <table className={cn("w-full caption-bottom text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("border-b border-[#EEF0F3] transition-colors hover:bg-[#F5F6F8]", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        "h-10 whitespace-nowrap px-4 text-left align-middle text-[11px] font-bold uppercase tracking-[0.05em] text-[#5B6472]",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return <td className={cn("whitespace-nowrap px-4 py-[13px] align-middle text-[13px] text-[#5B6472]", className)} {...props} />;
}
