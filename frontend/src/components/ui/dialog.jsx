import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

export function Dialog({ open, title, description, children, onClose, className }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={(next) => !next && onClose?.()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <RadixDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95",
            className
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <RadixDialog.Title className="text-base font-semibold text-slate-950">{title}</RadixDialog.Title>
              {description && <RadixDialog.Description className="mt-1 text-sm text-slate-500">{description}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </RadixDialog.Close>
          </div>
          <div className="p-5">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
