"use client";

import { formatDistanceToNow } from "date-fns";
import type { ChatMessage } from "@/lib/types";
import { FeedbackButtons } from "./FeedbackButtons";

interface MessageBubbleProps {
  message: ChatMessage;
  conversationId: string;
}

export function MessageBubble({ message, conversationId }: MessageBubbleProps) {
  const time = formatDistanceToNow(new Date(message.timestamp), { addSuffix: true });

  if (message.role === "system") {
    return (
      <div className="flex justify-center animate-fade-up px-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 border border-warning/20 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
          <span className="text-xs text-warning">{message.content}</span>
        </div>
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-up px-4">
        <div className="max-w-[72%]">
          <div className="bg-bg-elevated border border-border rounded-2xl rounded-tr-sm px-4 py-2.5">
            <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-xs text-text-muted mt-1 text-right pr-1">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-fade-up group px-4">
      <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs font-semibold text-accent">R</span>
      </div>
      <div className="max-w-[72%]">
        <div className="bg-bg-surface border border-border/60 rounded-2xl rounded-tl-sm px-4 py-2.5">
          <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="flex items-center mt-1 pl-1">
          <p className="text-xs text-text-muted">{time}</p>
          {message.id && (
            <FeedbackButtons messageId={message.id} conversationId={conversationId} />
          )}
        </div>
      </div>
    </div>
  );
}
