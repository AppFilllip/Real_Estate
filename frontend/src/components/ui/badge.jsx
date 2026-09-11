import { cn } from "../../lib/utils";

const tones = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  blue: "border-sky-200 bg-sky-50 text-sky-700",
  red: "border-red-200 bg-red-50 text-red-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export function Badge({ className, tone = "slate", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium",
        tones[tone] || tones.slate,
        className
      )}
      {...props}
    />
  );
}
