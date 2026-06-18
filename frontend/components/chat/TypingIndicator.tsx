export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-7 h-7 rounded-full bg-gray-100 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs text-gray-400">S</span>
      </div>
      <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-blink" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-blink-delay-200" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-blink-delay-400" />
        </div>
      </div>
    </div>
  );
}
