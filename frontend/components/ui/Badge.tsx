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
          "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20": variant === "green",
          "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20": variant === "amber",
          "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20": variant === "red",
          "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20": variant === "gray",
          "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20": variant === "blue",
        }),
        className
      )}
    >
      {children}
    </span>
  );
}
