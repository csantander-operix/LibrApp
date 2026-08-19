import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900",
        "shadow-sm transition-colors placeholder:text-stone-400",
        "focus:border-unla focus:outline-none focus:ring-2 focus:ring-unla/25",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
