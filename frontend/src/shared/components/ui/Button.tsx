import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "gold" | "outline" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  // Bordó UNLa con brillo superior sutil y sombra cálida.
  primary:
    "bg-unla text-white shadow-sm shadow-unla/30 hover:bg-unla-dark hover:shadow-md hover:shadow-unla/40 disabled:opacity-60",
  // Acento de ubicación (oro/ámbar).
  gold: "bg-oro text-white shadow-sm shadow-oro/30 hover:brightness-95 hover:shadow-md disabled:opacity-60",
  outline:
    "border border-stone-300 bg-white/70 text-stone-700 hover:border-unla/40 hover:bg-unla/5 hover:text-unla",
  ghost: "text-stone-600 hover:bg-stone-100 hover:text-unla",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold",
        "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-unla/40 focus:ring-offset-1 focus:ring-offset-papel",
        "disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]",
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
