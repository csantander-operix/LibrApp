import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900",
        "shadow-sm transition-colors",
        "focus:border-unla focus:outline-none focus:ring-2 focus:ring-unla/25",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
