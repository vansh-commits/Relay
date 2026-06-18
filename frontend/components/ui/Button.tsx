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
          "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none",
          {
            "bg-accent text-white hover:bg-accent-hover focus-visible:ring-accent": variant === "primary",
            "bg-surface border border-border text-gray-700 hover:bg-surface-subtle focus-visible:ring-gray-300": variant === "secondary",
            "text-gray-600 hover:text-gray-900 hover:bg-surface-subtle focus-visible:ring-gray-300": variant === "ghost",
            "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 focus-visible:ring-red-300": variant === "danger",
            "px-3 py-1.5 text-sm gap-1.5": size === "sm",
            "px-4 py-2 text-sm gap-2": size === "md",
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
