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
      <div className="flex justify-center animate-slide-up">
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-full">
          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium text-amber-800">{message.content}</span>
        </div>
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="max-w-[75%]">
          <div className="bg-slate-800 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right pr-1">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-slide-up group">
      <div className="w-7 h-7 rounded-full bg-gray-100 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs font-medium text-gray-500">S</span>
      </div>
      <div className="max-w-[75%]">
        <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="flex items-center mt-1 pl-1">
          <p className="text-xs text-gray-400">{time}</p>
          {message.id && (
            <FeedbackButtons messageId={message.id} conversationId={conversationId} />
          )}
        </div>
      </div>
    </div>
  );
}
