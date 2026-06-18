import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 disabled:opacity-40 disabled:pointer-events-none",
          {
            "bg-accent text-white hover:bg-accent-hover":                                       variant === "primary",
            "bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover": variant === "secondary",
            "text-text-muted hover:text-text-primary hover:bg-bg-elevated":                     variant === "ghost",
            "bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20":              variant === "danger",
            "px-3 py-1.5 text-xs gap-1.5": size === "sm",
            "px-4 py-2 text-sm gap-2":     size === "md",
          }
        ),
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
