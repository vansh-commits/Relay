import type { ChatMode } from "@/lib/types";

export function ModeIndicator({ mode }: { mode: ChatMode }) {
  if (mode === "ai") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
        <span className="text-xs text-text-secondary">Relay Support</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse-dot" />
      <span className="text-xs text-warning">Specialist connected</span>
    </div>
  );
}
