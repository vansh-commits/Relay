import type { ChatMode } from "@/lib/types";

export function ModeIndicator({ mode }: { mode: ChatMode }) {
  if (mode === "ai") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm font-medium text-gray-700">Support</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span className="text-sm font-medium text-amber-800">Connected to a specialist</span>
      <span className="text-xs text-amber-600 ml-auto">Response times may vary</span>
    </div>
  );
}
