"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  conversationId: string;
}

export function MessageList({ messages, isTyping, conversationId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (messages.length === 0 && !isTyping) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-accent">R</span>
          </div>
          <p className="text-base font-semibold text-text-primary mb-1">How can I help you?</p>
          <p className="text-sm text-text-secondary">Ask anything about our products or services. I'll let you know if you need to speak with someone.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-4 space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} conversationId={conversationId} />
      ))}
      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
