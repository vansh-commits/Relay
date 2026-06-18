export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-up px-4">
      <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs font-semibold text-accent">R</span>
      </div>
      <div className="bg-bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3 mt-0.5">
        <div className="flex gap-1.5 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-blink" />
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-blink-200" />
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-blink-400" />
        </div>
      </div>
    </div>
  );
}
