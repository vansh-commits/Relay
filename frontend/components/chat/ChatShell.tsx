"use client";

import Link from "next/link";
import { useChat } from "@/hooks/useChat";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ModeIndicator } from "./ModeIndicator";

export function ChatShell() {
  const { sessionId, messages, mode, isTyping, connected, sendMessage } = useChat();

  return (
    <div className="flex flex-col h-screen bg-bg-base">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-base flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
            <span className="text-sm font-bold text-accent">R</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-none">Relay</p>
            <p className="text-xs text-text-muted mt-0.5 leading-none">Support</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ModeIndicator mode={mode} />
          <div
            className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success" : "bg-text-muted"}`}
            title={connected ? "Connected" : "Reconnecting…"}
          />
          <Link
            href="/admin"
            className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-bg-elevated"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Escalation banner */}
      {mode === "human" && (
        <div className="px-4 py-2.5 bg-warning/10 border-b border-warning/20 flex items-center gap-2 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse-dot flex-shrink-0" />
          <p className="text-xs text-warning">A specialist has been notified and will join shortly.</p>
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} isTyping={isTyping} conversationId={sessionId} />

      {/* Input */}
      <MessageInput onSend={sendMessage} disabled={mode === "human"} />
    </div>
  );
}
