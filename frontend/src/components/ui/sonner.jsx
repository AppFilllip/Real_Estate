import { Toaster as Sonner } from "sonner";

export function Toaster(props) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-[#E2E5EA] bg-white shadow-lg font-sans",
          title: "text-[13.5px] font-semibold text-[#101418]",
          description: "text-[12.5px] text-[#5B6472]",
          success: "!border-l-4 !border-l-[#16A34A]",
          error: "!border-l-4 !border-l-[#DC2626]",
        },
      }}
      {...props}
    />
  );
}
