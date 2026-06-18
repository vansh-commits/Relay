import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type BadgeVariant = "green" | "amber" | "red" | "gray" | "blue";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "gray", className }: BadgeProps) {
  return (
    <span
      className={twMerge(
        clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", {
          "bg-success/15 text-success ring-1 ring-inset ring-success/20":  variant === "green",
          "bg-warning/15 text-warning ring-1 ring-inset ring-warning/20":  variant === "amber",
          "bg-danger/15 text-danger ring-1 ring-inset ring-danger/20":     variant === "red",
          "bg-bg-elevated text-text-secondary ring-1 ring-inset ring-border": variant === "gray",
          "bg-accent/15 text-accent ring-1 ring-inset ring-accent/20":     variant === "blue",
        }),
        className
      )}
    >
      {children}
    </span>
  );
}
