"use client";

import Link from "next/link";
import { useChat } from "@/hooks/useChat";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ModeIndicator } from "./ModeIndicator";

export function ChatShell() {
  const { sessionId, messages, mode, isTyping, connected, sendMessage } = useChat();

  const conversationId = sessionId;

  return (
    <div className="flex flex-col h-screen bg-surface-muted">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">Support</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-none">We typically reply instantly</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ModeIndicator mode={mode} />
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-gray-300"}`} title={connected ? "Connected" : "Reconnecting..."} />
          <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Admin
          </Link>
        </div>
      </header>

      {/* Escalation banner */}
      {mode === "human" && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          <p className="text-xs text-amber-800 font-medium">A specialist has been notified and will join shortly.</p>
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} isTyping={isTyping} conversationId={conversationId} />

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        disabled={mode === "human"}
      />
    </div>
  );
}
