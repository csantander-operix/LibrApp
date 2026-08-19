import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm shadow-stone-900/5",
        "transition-shadow",
        className,
      )}
      {...props}
    />
  );
}
